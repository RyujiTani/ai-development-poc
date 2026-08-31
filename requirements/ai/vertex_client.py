import os

from google import genai
from google.genai import types
from typing import Optional


class VertexClient:
    """
    Vertex AI Geminiを呼び出すクライアント。

    必要な環境変数:
        GOOGLE_CLOUD_PROJECT
        GOOGLE_CLOUD_LOCATION

    認証:
        Application Default Credentialsを使用する。
    """

    def __init__(
        self,
        project: Optional[str] = None,
        location: Optional[str] = None,
        model: Optional[str] = None,
    ) -> None:
        self.project = project or os.environ.get("GOOGLE_CLOUD_PROJECT")
        self.location = location or os.environ.get(
            "GOOGLE_CLOUD_LOCATION",
            "global",
        )
        self.model = model or os.environ.get(
            "VERTEX_AI_MODEL",
            "gemini-3.5-flash",
        )

        if not self.project:
            raise ValueError(
                "GOOGLE_CLOUD_PROJECT is not set."
            )

        self.client = genai.Client(
            vertexai=True,
            project=self.project,
            location=self.location,
            http_options=types.HttpOptions(
                api_version="v1",
            ),
        )

    def generate(self, prompt: str) -> str:
        """
        プロンプトをGeminiへ送信し、生成されたテキストを返す。
        """

        if not prompt.strip():
            raise ValueError("Prompt must not be empty.")

        response = self.client.models.generate_content(
            model=self.model,
            contents=prompt,
            config=types.GenerateContentConfig(
                temperature=0,
                candidate_count=1,
                response_mime_type="application/json",
            ),
        )

        if not response.text:
            raise RuntimeError(
                "Vertex AI returned an empty response."
            )

        return response.text