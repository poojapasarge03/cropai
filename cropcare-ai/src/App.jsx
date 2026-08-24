import { useState } from "react";
import "./App.css";

function App() {
  const [selectedImage, setSelectedImage] = useState(null);
  const [preview, setPreview] = useState(null);

  const handleImageChange = (event) => {
    const file = event.target.files[0];

    if (file) {
      setSelectedImage(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  return (
    <div className="container">
      <header>
        <h1>🌾 CropCare AI</h1>
        <p>AI-powered crop disease detection assistant</p>
      </header>

      <main className="card">
        <h2>Upload a Crop Image</h2>

        <p>
          Upload a clear image of a plant or leaf. CropCare AI will analyze
          possible disease symptoms and provide general guidance.
        </p>

        <input
          type="file"
          accept="image/*"
          onChange={handleImageChange}
        />

        {preview && (
          <div className="preview-container">
            <h3>Selected Image</h3>

            <img
              src={preview}
              alt="Selected crop"
              className="preview-image"
            />

            <p>
              <strong>File:</strong> {selectedImage.name}
            </p>
          </div>
        )}

        <button disabled={!selectedImage}>
          Analyze with AI
        </button>

        <p className="disclaimer">
          ⚠️ CropCare AI provides general AI-assisted guidance and should not
          replace advice from qualified agricultural experts.
        </p>
      </main>
    </div>
  );
}

export default App;