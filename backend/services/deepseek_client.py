import json
from dataclasses import dataclass
from urllib import request
from urllib.error import HTTPError, URLError


SYSTEM_PROMPT_SUMMARY = (
    "你是肺康复临床协作平台的 AI 辅助助手，服务于医生端。\n\n"
    "核心定位：以医生的关键判断为方向、以患者全量数据为依据，生成融合性综合建议。\n\n"
    "规则：\n"
    "1. 医生的关键判断具有最高优先级——你的任务是围绕每一条判断寻找数据支撑，而非反驳或弱化\n"
    "2. 综合分析患者全量上下文：生命体征（心率、血氧）、评估指标（呼吸困难、疲劳）、训练数据、风险状态、康复等级、预警记录\n"
    "3. 优先关注异常数据：血氧低于95%需重点关注、疲劳>7分提示训练不耐受、存在未处理预警需明确提醒\n"
    "4. 禁止输出诊断结论、用药建议、治疗方案变更建议\n\n"
    "输出格式（严格遵守，纯文本，总计不超过 400 字）：\n"
    "【综合建议】— 将医生的判断与数据发现融合成 2-3 句连贯建议，每句自然衔接医生观点和数据证据\n"
    "【数据洞察】— AI 从全量数据中发现的医生未覆盖的关联或异常（1-2 条，如无则省略）\n"
    "【风险提醒】— 如存在预警记录或指标异常，简洁提醒（如无则省略）"
)

SYSTEM_PROMPT_PRESCRIPTION = (
    "你是一名专业的肺康复治疗师。根据医生的关键判断和患者数据（康复等级、健康档案、最新评估），"
    "生成个性化的肺康复训练处方。\n\n"
    "要求：\n"
    "1. 医生的关键判断具有最高优先级——围绕医生的每个要点寻找数据支撑并细化\n"
    "2. 处方必须包含 2-4 个训练动作\n"
    "3. 每个动作必须包含：名称、目的、时长/次数、具体步骤、注意事项\n"
    "4. 必须考虑患者当前恢复阶段和风险因素\n"
    "5. 训练强度必须与康复等级匹配，严禁超负荷\n"
    "6. 如有安全风险，必须在注意事项中明确提示\n"
    "7. 输出 JSON 格式，不要输出 Markdown\n\n"
    "输出格式（严格遵守）：\n"
    '{"title": "方案标题", "exercises": [{"name": "动作名称", '
    '"purpose": "训练目的", "duration": "时长描述", "steps": '
    '["步骤1", "步骤2"], "precautions": ["注意1", "注意2"]}]}'
)

SYSTEM_PROMPT_GUIDANCE_CHAT = (
    "你是肺康复平台的AI康复指导助手，直接面向患者对话。\n\n"
    "核心定位：基于患者当前康复数据，给出温暖、实用、个性化的指导。\n\n"
    "规则：\n"
    "1. 基于注入的患者上下文数据（康复等级、训练完成率、血氧、疲劳评分、预警记录等）给出个性化建议\n"
    "2. 语气温暖鼓励，用「您」称呼，避免医学术语堆砌，像一位关心的康复教练\n"
    "3. 安全红线（严格遵守）：\n"
    "   - 禁止任何诊断结论\n"
    "   - 禁止用药建议\n"
    "   - 禁止建议调整医生下发的处方\n"
    "   - 出现异常指标时必须引导患者联系医生\n"
    "4. 回复控制在200字以内，简洁实用，重点突出\n"
    "5. 如果患者提问超出你的能力范围，坦诚告知并建议咨询医生\n\n"
    "患者上下文数据已随每条消息动态注入，你应据此给出个性化回复。"
)


@dataclass
class DeepSeekClient:
    api_key: str
    base_url: str
    model: str
    timeout_seconds: int = 60

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

    def generate_weekly_summary(self, payload: dict, doctor_input: str) -> str:
        user_content = json.dumps(
            {
                "doctor_judgments": doctor_input,
                "patient_context": payload,
            },
            ensure_ascii=False,
        )
        content = self._call_api(
            system_prompt=SYSTEM_PROMPT_SUMMARY,
            user_content=user_content,
            temperature=0.5,
            max_tokens=800,
        )
        return content[:800]

    def generate_prescription(self, payload: dict, doctor_input: str) -> dict:
        """根据医生关键判断 + 患者数据生成 AI 训练处方，返回解析后的 JSON dict。"""
        user_content = json.dumps(
            {
                "doctor_judgments": doctor_input,
                "patient_context": payload,
            },
            ensure_ascii=False,
        )
        raw_content = self._call_api(
            system_prompt=SYSTEM_PROMPT_PRESCRIPTION,
            user_content=user_content,
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

    def generate_guidance_reply(self, patient_context: dict, question: str) -> str:
        """面向患者的AI指导对话：动态注入患者数据，给出个性化回复。"""
        user_content = json.dumps(
            {
                "patient_context": patient_context,
                "question": question,
            },
            ensure_ascii=False,
        )
        content = self._call_api(
            system_prompt=SYSTEM_PROMPT_GUIDANCE_CHAT,
            user_content=user_content,
            temperature=0.7,
            max_tokens=400,
        )
        return content[:400]
