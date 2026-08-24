import { useState } from "react";
import "./App.css";

function App() {
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState("");

  const handleImageChange = (event) => {
    const file = event.target.files[0];

    setError("");

    if (!file) {
      return;
    }

    // Check file type
    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file.");
      return;
    }

    // Check file size - maximum 5 MB
    if (file.size > 5 * 1024 * 1024) {
      setError("Image size must be less than 5 MB.");
      return;
    }

    setImage(file);

    // Create preview
    const imageUrl = URL.createObjectURL(file);
    setPreview(imageUrl);
  };

 const handleAnalyze = async () => {
  if (!image) {
    setError("Please select an image first.");
    return;
  }

  setError("");

  const formData = new FormData();
  formData.append("image", image);

  try {
    const response = await fetch("http://localhost:5000/api/analyze", {
      method: "POST",
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed to analyze image.");
    }

    alert(data.result);
  } catch (error) {
    console.error("Analysis error:", error);
    setError(error.message || "Something went wrong while analyzing.");
  }
};

  return (
    <div className="app">

      <div className="header">
        <div className="logo">🌾</div>

        <h1>CropCare AI</h1>

        <p>AI-powered crop disease detection assistant</p>
      </div>

      <div className="upload-card">

        <h2>Upload a Crop Image</h2>

        <p>
          Upload a clear image of a plant or leaf.
          CropCare AI will analyze possible disease symptoms
          and provide general guidance.
        </p>

        <input
          type="file"
          accept="image/*"
          onChange={handleImageChange}
        />

        {error && (
          <p className="error">
            {error}
          </p>
        )}

        {preview && (
          <div className="preview-container">

            <h3>Selected Image</h3>

            <img
              src={preview}
              alt="Selected crop"
              className="crop-preview"
            />

          </div>
        )}

        <button
          onClick={handleAnalyze}
          disabled={!image}
        >
          Analyze with AI
        </button>

        <p className="warning">
          ⚠️ CropCare AI provides general AI-assisted guidance
          and should not replace advice from qualified
          agricultural experts.
        </p>

      </div>

    </div>
  );
}

export default App;