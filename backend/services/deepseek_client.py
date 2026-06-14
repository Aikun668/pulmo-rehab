import json
from dataclasses import dataclass
from urllib import request
from urllib.error import HTTPError, URLError


SYSTEM_PROMPT_SUMMARY = (
    "你是肺康复训练助手。请基于患者近 7 天训练数据，生成 200 字以内的康复小结。"
    "只能总结训练趋势、完成情况和鼓励性建议；禁止输出诊断、治疗建议、用药建议。"
    "输出纯文本，不要使用 Markdown。"
)

SYSTEM_PROMPT_PRESCRIPTION = (
    "你是一名专业的肺康复治疗师。根据患者的康复等级、健康档案和最新评估数据，"
    "生成个性化的肺康复训练处方。\n\n"
    "要求：\n"
    "1. 处方必须包含 2-4 个训练动作\n"
    "2. 每个动作必须包含：名称、目的、时长/次数、具体步骤、注意事项\n"
    "3. 必须考虑患者当前恢复阶段和风险因素\n"
    "4. 训练强度必须与康复等级匹配，严禁超负荷\n"
    "5. 如有安全风险，必须在注意事项中明确提示\n"
    "6. 输出 JSON 格式，不要输出 Markdown\n\n"
    "输出格式（严格遵守）：\n"
    '{"title": "方案标题", "exercises": [{"name": "动作名称", '
    '"purpose": "训练目的", "duration": "时长描述", "steps": '
    '["步骤1", "步骤2"], "precautions": ["注意1", "注意2"]}]}'
)


@dataclass
class DeepSeekClient:
    api_key: str
    base_url: str
    model: str
    timeout_seconds: int = 30

    def _call_api(self, system_prompt: str, user_content: str, temperature: float = 0.5, max_tokens: int = 1000) -> str:
        if not self.api_key:
            raise ValueError("DEEPSEEK_API_KEY is not configured.")

        endpoint = f"{self.base_url.rstrip('/')}/chat/completions"
        request_payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_content},
            ],
            "temperature": temperature,
            "max_tokens": max_tokens,
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

        try:
            with request.urlopen(http_request, timeout=self.timeout_seconds) as response:
                raw_body = response.read().decode("utf-8")
        except HTTPError as exc:
            error_body = exc.read().decode("utf-8", errors="replace")
            raise RuntimeError(f"DeepSeek API returned {exc.code}: {error_body}") from exc
        except URLError as exc:
            raise RuntimeError(f"Failed to reach DeepSeek API: {exc.reason}") from exc

        response_body = json.loads(raw_body)
        content = response_body["choices"][0]["message"]["content"].strip()
        return content

    def generate_weekly_summary(self, payload: dict) -> str:
        content = self._call_api(
            system_prompt=SYSTEM_PROMPT_SUMMARY,
            user_content=json.dumps(payload, ensure_ascii=False),
            temperature=0.5,
            max_tokens=300,
        )
        return content[:200]

    def generate_prescription(self, payload: dict) -> dict:
        """根据患者数据生成 AI 训练处方，返回解析后的 JSON dict。"""
        raw_content = self._call_api(
            system_prompt=SYSTEM_PROMPT_PRESCRIPTION,
            user_content=json.dumps(payload, ensure_ascii=False),
            temperature=0.6,
            max_tokens=1500,
        )
        # 尝试解析 JSON（AI 可能返回 ```json 包裹的内容）
        cleaned = raw_content.strip()
        if cleaned.startswith("```"):
            lines = cleaned.split("\n")
            lines = [line for line in lines if not line.strip().startswith("```")]
            cleaned = "\n".join(lines)

        try:
            result = json.loads(cleaned)
        except json.JSONDecodeError:
            # JSON 解析失败，返回原始文本作为 content 字段
            result = {"title": "AI 生成训练方案", "raw_content": cleaned}

        return result
