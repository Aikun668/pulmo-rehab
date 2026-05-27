import json
from dataclasses import dataclass
from urllib import request


SYSTEM_PROMPT = (
    "你是肺康复训练助手。请基于患者近 7 天训练数据，生成 200 字以内的康复小结。"
    "只能总结训练趋势、完成情况和鼓励性建议；禁止输出诊断、治疗建议、用药建议。"
    "输出纯文本，不要使用 Markdown。"
)


@dataclass
class DeepSeekClient:
    api_key: str
    base_url: str
    model: str
    timeout_seconds: int = 30

    def generate_weekly_summary(self, payload: dict) -> str:
        if not self.api_key:
            raise ValueError("DEEPSEEK_API_KEY is not configured.")

        endpoint = f"{self.base_url.rstrip('/')}/chat/completions"
        request_payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": json.dumps(payload, ensure_ascii=False),
                },
            ],
            "temperature": 0.5,
        }

        http_request = request.Request(
            endpoint,
            data=json.dumps(request_payload).encode("utf-8"),
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
            },
            method="POST",
        )

        with request.urlopen(http_request, timeout=self.timeout_seconds) as response:
            raw_body = response.read().decode("utf-8")

        response_body = json.loads(raw_body)
        summary = response_body["choices"][0]["message"]["content"].strip()
        return summary[:200]
