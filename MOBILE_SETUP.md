# Mobile APK & Cloud Deployment Instructions

I have prepared your project for Android and Cloud deployment. Follow these steps to complete the process.

## Step 1: Deploy to the Cloud (Backend)
1. **Push to GitHub**: If you haven't already, push this entire project to a GitHub repository.
2. **Login to Render**: Go to [Render.com](https://render.com).
3. **New Web Service**:
   - Link your GitHub repo.
   - Choose the **khakhra-backend** service.
   - Render will automatically detect the `render.yaml` file I created.
4. **Wait for Deployment**: Render will build the backend and provide you with a URL (e.g., `https://khakhra-backend.onrender.com`).

## Step 2: Configure the App for the APK
1. Open the file `frontend/.env.production` (I have created this for you).
2. Replace the placeholder with your actual Render URL:
   ```
   VITE_API_URL=https://your-backend-name.onrender.com
   ```

## Step 3: Build the APK
1. **Install Android Studio**: Ensure you have [Android Studio](https://developer.android.com/studio) installed.
2. **Build the Web Code**: In your terminal, run:
   ```bash
   cd frontend
   npm run build
   ```
3. **Sync with Android**:
   ```bash
   npx cap sync android
   ```
4. **Open in Android Studio**:
   ```bash
   npx cap open android
   ```
5. **Generate APK**:
   - In Android Studio, wait for the project to load (Gradle sync).
   - Go to **Build > Build Bundle(s) / APK(s) > Build APK(s)**.
   - Once finished, a notification will appear. Click **Locate** to find your `app-debug.apk`.

## Step 4: Install on Phone
1. Transfer the `.apk` file to your Android phone.
2. Open the file on your phone and tap **Install**.
3. You may need to "Allow installation from unknown sources" in your phone settings.

---

### Key Files Created/Modified:
- `backend/requirements.txt`: Python dependencies for the cloud.
- `backend/database.py`: Updated to support persistent cloud storage.
- `render.yaml`: Configuration for one-click deployment to Render.
- `frontend/src/services/api.ts`: Updated to switch between local and cloud servers.
- `frontend/capacitor.config.ts`: Android app configuration.
- `frontend/android/`: The native Android project folder.
