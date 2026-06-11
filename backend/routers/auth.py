import logging

import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from core.config import settings
from core.responses import success_response
from core.security import create_token, get_current_user
from database import get_db
from models import User, UserRole
from schemas import DevLoginRequest, LoginResponse, WxLoginRequest

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["认证"])


def _build_login_response(user: User) -> dict:
    token = create_token(user.id, user.role.value)
    return success_response(
        data=LoginResponse(
            token=token,
            user_id=user.id,
            role=user.role.value,
            name=user.name,
            doctor_id=user.doctor_id,
        ).model_dump()
    )


@router.post("/dev-login", summary="开发模式登录（仅 DEBUG=true 时可用）")
def dev_login(body: DevLoginRequest, db: Session = Depends(get_db)):
    if not settings.debug:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="开发模式登录仅在 DEBUG 模式下可用")

    user = db.query(User).filter(User.id == body.patient_id, User.role == UserRole.PATIENT).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="患者不存在")

    logger.info("Dev login: user_id=%s, name=%s", user.id, user.name)
    return _build_login_response(user)


@router.post("/wx-login", summary="微信小程序登录")
def wx_login(body: WxLoginRequest, db: Session = Depends(get_db)):
    if not settings.wechat_appid or not settings.wechat_secret:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="微信配置未设置")

    # 用 code 换 openid
    url = (
        f"https://api.weixin.qq.com/sns/jscode2session"
        f"?appid={settings.wechat_appid}"
        f"&secret={settings.wechat_secret}"
        f"&js_code={body.code}"
        f"&grant_type=authorization_code"
    )
    try:
        resp = httpx.get(url, timeout=10)
        resp_data = resp.json()
    except Exception as e:
        logger.error("WeChat jscode2session failed: %s", e)
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="微信登录服务暂不可用")

    openid = resp_data.get("openid")
    if not openid:
        errcode = resp_data.get("errcode", "unknown")
        errmsg = resp_data.get("errmsg", "unknown error")
        logger.error("WeChat jscode2session error: errcode=%s, errmsg=%s", errcode, errmsg)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=f"微信登录失败: {errmsg}")

    # 查找已有用户
    user = db.query(User).filter(User.openid == openid).first()
    if user:
        return _build_login_response(user)

    # 新用户 — 创建 patient 记录（后续可通过医生端绑定 doctor_id）
    new_user = User(
        role=UserRole.PATIENT,
        name=f"患者{openid[-4:]}",
        openid=openid,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    logger.info("New WeChat user created: user_id=%s, openid=%s", new_user.id, openid)
    return _build_login_response(new_user)


@router.get("/me", summary="获取当前用户信息")
def get_me(current_user: User = Depends(get_current_user)):
    return success_response(data={
        "user_id": current_user.id,
        "role": current_user.role.value,
        "name": current_user.name,
        "doctor_id": current_user.doctor_id,
    })
