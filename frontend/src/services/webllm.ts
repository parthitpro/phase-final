import { CreateMLCEngine, MLCEngine } from "@mlc-ai/web-llm";

export type ProgressCallback = (report: { text: string }) => void;

class WebLLMService {
  private engine: MLCEngine | null = null;
  private selectedModel = "Llama-3.2-1B-Instruct-q4f32_1-MLC";
  private initPromise: Promise<void> | null = null;
  private isProcessing = false;

  /**
   * Initializes the MLC Engine with the selected model.
   * This will download the model weights if they are not already cached.
   */
  async init(onProgress: ProgressCallback) {
    if (this.engine) return;
    
    // If initialization is already in progress, wait for it
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = (async () => {
      try {
        this.engine = await CreateMLCEngine(this.selectedModel, {
          initProgressCallback: onProgress,
        });
      } catch (error) {
        this.initPromise = null;
        throw error;
      }
    })();

    return this.initPromise;
  }

  /**
   * Generates a response from the local LLM.
   */
  async chat(messages: any[], onStream?: (text: string) => void) {
    if (!this.engine) {
      throw new Error("AI Engine not initialized. Please wait for the model to download.");
    }

    if (this.isProcessing) {
      throw new Error("AI is already processing a request. Please wait.");
    }

    this.isProcessing = true;
    try {
      const chunks = await this.engine.chat.completions.create({
        messages,
        stream: true,
      });

      let fullText = "";
      for await (const chunk of chunks) {
        const content = chunk.choices[0]?.delta?.content || "";
        fullText += content;
        if (onStream) onStream(fullText);
      }

      return fullText;
    } catch (error: any) {
      // If we hit a fatal WebGPU error, reset the engine
      if (error.message?.includes("GPUBuffer") || error.message?.includes("unmapped")) {
        console.error("Fatal WebGPU error detected. Resetting engine state.");
        this.engine = null;
        this.initPromise = null;
      }
      throw error;
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Unloads the engine to free up GPU memory.
   */
  async unload() {
    if (this.engine) {
      await this.engine.unload();
      this.engine = null;
    }
  }

  isInitialized() {
    return this.engine !== null;
  }

  getModelName() {
    return this.selectedModel;
  }
}

export const webLLM = new WebLLMService();
