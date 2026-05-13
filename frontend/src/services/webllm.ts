import { CreateMLCEngine, MLCEngine } from "@mlc-ai/web-llm";

export type ProgressCallback = (report: any) => void;

class WebLLMService {
  private engine: MLCEngine | null = null;
  private selectedModel = "Llama-3.2-1B-Instruct-q4f32_1-MLC";

  /**
   * Initializes the MLC Engine with the selected model.
   * This will download the model weights if they are not already cached.
   */
  async init(onProgress: ProgressCallback) {
    if (this.engine) return;

    this.engine = await CreateMLCEngine(this.selectedModel, {
      initProgressCallback: onProgress,
    });
  }

  /**
   * Generates a response from the local LLM.
   */
  async chat(messages: any[], onStream?: (text: string) => void) {
    if (!this.engine) {
      throw new Error("AI Engine not initialized. Please wait for the model to download.");
    }

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
