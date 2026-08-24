import { useState } from "react";
import "./App.css";

function App() {
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const handleFile = (file) => {
    setError("");
    setResult(null);

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Image size must be less than 5 MB.");
      return;
    }

    setImage(file);

    const imageUrl = URL.createObjectURL(file);
    setPreview(imageUrl);
  };

  const handleImageChange = (event) => {
    handleFile(event.target.files[0]);
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (event) => {
    event.preventDefault();
    setDragActive(false);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setDragActive(false);

    const file = event.dataTransfer.files[0];
    handleFile(file);
  };

  const handleAnalyze = async () => {
    if (!image) {
      setError("Please select an image first.");
      return;
    }

    setError("");
    setResult(null);
    setLoading(true);

    const formData = new FormData();
    formData.append("image", image);

    try {
      const response = await fetch(
        "http://localhost:5000/api/analyze",
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to analyze image."
        );
      }

      setResult(data.result);
    } catch (error) {
      console.error("Analysis error:", error);

      setError(
        error.message ||
          "Something went wrong while analyzing the image."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app">

      <div className="header">
        <div className="logo">🌾</div>

        <h1>CropCare AI</h1>

        <p>
          AI-powered crop disease detection assistant
        </p>
      </div>

      <div className="upload-card">

        <h2>Upload a Crop Image</h2>

        <p>
          Upload a clear image of a plant or leaf.
          CropCare AI will analyze possible disease
          symptoms and provide general guidance.
        </p>

        {/* Drag and Drop Area */}

        <label
          className={`drop-zone ${
            dragActive ? "drag-active" : ""
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >

          <input
            type="file"
            accept="image/*"
            onChange={handleImageChange}
          />

          <div className="upload-icon">
            {dragActive ? "🌱" : "📷"}
          </div>

          <h3>
            {dragActive
              ? "Drop your image here"
              : "Drag & drop your crop image"}
          </h3>

          <p>
            or <span>browse files</span>
          </p>

          <small>
            JPG, PNG or WEBP · Maximum 5 MB
          </small>

        </label>

        {error && (
          <p className="error">
            {error}
          </p>
        )}

        {/* Image Preview */}

        {preview && !loading && (
          <div className="preview-container">

            <div className="preview-header">
              <h3>Selected Image</h3>

              <span>
                ✓ Ready for analysis
              </span>
            </div>

            <img
              src={preview}
              alt="Selected crop"
              className="crop-preview"
            />

          </div>
        )}

        {/* Analyze Button */}

        <button
          onClick={handleAnalyze}
          disabled={!image || loading}
        >
          {loading
            ? "Analyzing crop..."
            : "Analyze with AI"}
        </button>

        {/* AI Scanning Animation */}

        {loading && (
          <div className="scanning-container">

            <div className="scan-image">

              {preview && (
                <img
                  src={preview}
                  alt="Analyzing crop"
                />
              )}

              <div className="scan-line"></div>

            </div>

            <div className="scanning-text">

              <div className="loading-dots">
                <span></span>
                <span></span>
                <span></span>
              </div>

              <strong>
                CropCare AI is analyzing your image
              </strong>

              <p>
                Checking plant characteristics and
                visible disease symptoms...
              </p>

            </div>

          </div>
        )}

        {/* AI Result */}

        {result && (
          <div className="result-card">

            <div className="result-header">

              <div>
                <span className="result-label">
                  AI ANALYSIS
                </span>

                <h2>
                  🌱 Crop Health Assessment
                </h2>
              </div>

              <span
                className={`confidence ${String(
                  result.confidence || ""
                ).toLowerCase()}`}
              >
                {result.confidence || "Unknown"} confidence
              </span>

            </div>

            <div className="plant-section">

              <div className="plant-icon">
                🌿
              </div>

              <div>

                <span className="section-label">
                  PLANT IDENTIFIED
                </span>

                <h3>
                  {result.plantName ||
                    "Unknown plant"}
                </h3>

                {result.scientificName && (
                  <p className="scientific-name">
                    {result.scientificName}
                  </p>
                )}

              </div>

            </div>

            <div className="diagnosis-section">

              <span className="section-label">
                POSSIBLE DISEASE
              </span>

              <h3>
                🦠{" "}
                {result.disease ||
                  "No clear disease identified"}
              </h3>

              {result.pathogen && (
                <p>
                  Possible cause:{" "}
                  <em>{result.pathogen}</em>
                </p>
              )}

            </div>

            <div className="analysis-grid">

              <div className="analysis-box">

                <h3>
                  🔍 Visible Symptoms
                </h3>

                <ul>
                  {(result.symptoms || []).map(
                    (symptom, index) => (
                      <li key={index}>
                        {symptom}
                      </li>
                    )
                  )}
                </ul>

              </div>

              <div className="analysis-box">

                <h3>
                  💊 Recommended Treatment
                </h3>

                <ol>
                  {(result.treatment || []).map(
                    (item, index) => (
                      <li key={index}>
                        {item}
                      </li>
                    )
                  )}
                </ol>

              </div>

            </div>

            <div className="prevention-box">

              <h3>
                🛡️ Prevention Tips
              </h3>

              <div className="prevention-list">

                {(result.prevention || []).map(
                  (tip, index) => (
                    <div
                      className="prevention-item"
                      key={index}
                    >
                      <span>✓</span>

                      <p>
                        {tip}
                      </p>
                    </div>
                  )
                )}

              </div>

            </div>

            <div className="result-disclaimer">
              <strong>Important:</strong>{" "}
              This is general AI-assisted guidance
              and should not replace advice from a
              qualified agricultural expert.
            </div>

          </div>
        )}

        <p className="warning">
          ⚠️ CropCare AI provides general AI-assisted
          guidance and should not replace advice from
          qualified agricultural experts.
        </p>

      </div>

    </div>
  );
}

export default App;