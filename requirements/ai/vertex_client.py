import os

from google import genai
from google.genai import types
from typing import Optional
import random
import time

from google.genai.errors import ClientError


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
            project=self.project_id,
            location=self.location,
            http_options=types.HttpOptions(
                retry_options=types.HttpRetryOptions(
                    attempts=8,
                    initial_delay=5.0,
                    max_delay=120.0,
                    exp_base=2.0,
                    jitter=1.0,
                    http_status_codes=[
                        408,
                        429,
                        500,
                        502,
                        503,
                        504,
                    ],
                )
            ),
        )

    def generate(
        self,
        prompt: str,
    ) -> str:

        max_retries = 5
        base_delay_seconds = 10

        for attempt in range(
            max_retries + 1
        ):
            try:
                response = self.client.models.generate_content(
                    model=self.model,
                    contents=prompt
                )

                return response.text

            except ClientError as exc:

                status_code = getattr(
                    exc,
                    "status_code",
                    None,
                )

                if status_code != 429:
                    raise

                if attempt >= max_retries:
                    raise

                # 10, 20, 40, 80, 160秒程度
                # ＋同時刻への再集中を避けるjitter
                delay = (
                    base_delay_seconds
                    * (2 ** attempt)
                    + random.uniform(0, 5)
                )

                print()
                print(
                    "Vertex AI returned 429 "
                    "RESOURCE_EXHAUSTED."
                )
                print(
                    f"Retrying in "
                    f"{delay:.1f} seconds..."
                )
                print(
                    f"Retry "
                    f"{attempt + 1}/{max_retries}"
                )

                time.sleep(delay)

        raise RuntimeError(
            "Vertex AI generation failed."
        )