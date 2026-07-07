import csv
import re
import sys

import requests
from PyQt5 import QtWidgets


def normalize_base_url(raw):
    """Ensure the URL ends with /v1 exactly once."""
    url = raw.strip().rstrip("/")

    if re.search(r"/v1$", url, re.IGNORECASE):
        return url
    if re.search(r"/v1/.+", url, re.IGNORECASE):
        return re.sub(r"/v1/.+", "/v1", url, flags=re.IGNORECASE)

    return url + "/v1"


def api_get(url, api_key):
    """GET request with Bearer auth, returns parsed JSON."""
    headers = {"Authorization": f"Bearer {api_key}"}
    resp = requests.get(url, headers=headers)
    resp.raise_for_status()
    return resp.json()


class ModelFetcher(QtWidgets.QWidget):
    def __init__(self):
        """Build all UI elements."""
        super().__init__()
        self.setWindowTitle("Model Fetcher")
        self.models_data = []

        layout = QtWidgets.QVBoxLayout()

        self.url_input = QtWidgets.QLineEdit()
        self.url_input.setPlaceholderText("Enter OpenAI-compatible base URL")
        layout.addWidget(self.url_input)

        self.key_input = QtWidgets.QLineEdit()
        self.key_input.setPlaceholderText("Enter API key")
        self.key_input.setEchoMode(QtWidgets.QLineEdit.Password)
        layout.addWidget(self.key_input)

        self.query_dropdown = QtWidgets.QComboBox()
        self.query_dropdown.addItems([
            "List all models",
            "Fetch GPT-4",
            "Fetch GPT-3.5",
            "Fetch embeddings",
        ])
        layout.addWidget(self.query_dropdown)

        self.model_input = QtWidgets.QLineEdit()
        self.model_input.setPlaceholderText("Or enter model ID manually")
        layout.addWidget(self.model_input)

        self.fetch_button = QtWidgets.QPushButton("Fetch Models")
        self.fetch_button.clicked.connect(self.on_fetch)
        layout.addWidget(self.fetch_button)

        self.save_button = QtWidgets.QPushButton("Save to CSV")
        self.save_button.clicked.connect(self.save_to_csv)
        layout.addWidget(self.save_button)

        self.status = QtWidgets.QLabel("")
        layout.addWidget(self.status)

        self.results = QtWidgets.QListWidget()
        layout.addWidget(self.results)

        self.setLayout(layout)

    def set_status(self, text, color):
        """Update status label text and colour."""
        self.status.setText(text)
        self.status.setStyleSheet(f"color: {color};")

    def on_fetch(self):
        """Fetch models from the API and populate the list."""
        base_url = self.url_input.text().strip()
        api_key = self.key_input.text().strip()

        if not base_url or not api_key:
            self.set_status("Error: URL and API key required", "red")
            return

        base_url = normalize_base_url(base_url)
        choice = self.query_dropdown.currentText()
        manual_model = self.model_input.text().strip()

        try:
            if choice == "List all models":
                data = api_get(f"{base_url}/models", api_key)
                models = data.get("data", [])
                self.models_data = models
                self.results.clear()
                for m in models:
                    self.results.addItem(m["id"])
                self.set_status("Fetched all models successfully", "green")
            else:
                model_id = manual_model or choice.replace("Fetch ", "").lower()
                model_info = api_get(f"{base_url}/models/{model_id}", api_key)
                self.models_data = [model_info]
                self.results.clear()
                self.results.addItem(str(model_info))
                self.set_status(f"Fetched {model_id} successfully", "green")

        except Exception as e:
            self.set_status(f"Error: {e}", "red")

    def save_to_csv(self):
        """Write the last fetched models to a user-chosen CSV file."""
        if not self.models_data:
            self.set_status("No models to save", "red")
            return

        filename, _ = QtWidgets.QFileDialog.getSaveFileName(
            self, "Save CSV", "models.csv", "CSV Files (*.csv)"
        )
        if not filename:
            return

        try:
            with open(filename, "w", newline="", encoding="utf-8") as f:
                writer = csv.writer(f)
                writer.writerow(["id", "object", "created", "owned_by"])
                for m in self.models_data:
                    writer.writerow([
                        m.get("id", ""),
                        m.get("object", ""),
                        m.get("created", ""),
                        m.get("owned_by", ""),
                    ])
            self.set_status(f"Saved to {filename}", "green")
        except Exception as e:
            self.set_status(f"Error saving CSV: {e}", "red")


if __name__ == "__main__":
    app = QtWidgets.QApplication(sys.argv)
    window = ModelFetcher()
    window.show()
    sys.exit(app.exec_())