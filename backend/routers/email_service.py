"""
Email Notification Service using Resend API.
Handles transactional emails for:
- New user creation notifications
- Password reset emails
- Budget alert notifications
- Suspicious login alerts
"""
import os
import asyncio
import logging
from datetime import datetime, timezone
from typing import Optional, Dict, Any
import resend
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

# Initialize Resend
RESEND_API_KEY = os.environ.get("RESEND_API_KEY")
SENDER_EMAIL = os.environ.get("SENDER_EMAIL", "onboarding@resend.dev")
APP_NAME = "OpenRTB Bidder"
APP_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://openrtb-campaign-hub.preview.emergentagent.com")

if RESEND_API_KEY:
    resend.api_key = RESEND_API_KEY
    logger.info("Resend API initialized")
else:
    logger.warning("RESEND_API_KEY not found - emails will be logged only")


# ============== EMAIL TEMPLATES ==============

def get_base_template(content: str, title: str) -> str:
    """Base HTML email template with consistent styling"""
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>{title}</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #0B1221; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
            <tr>
                <td align="center" style="padding: 40px 20px;">
                    <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse; background-color: #151F32; border-radius: 12px; border: 1px solid #2D3B55;">
                        <!-- Header -->
                        <tr>
                            <td style="padding: 30px 40px; border-bottom: 1px solid #2D3B55;">
                                <table role="presentation" style="width: 100%;">
                                    <tr>
                                        <td>
                                            <span style="font-size: 24px; font-weight: bold; color: #3B82F6;">{APP_NAME}</span>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                        <!-- Content -->
                        <tr>
                            <td style="padding: 40px;">
                                {content}
                            </td>
                        </tr>
                        <!-- Footer -->
                        <tr>
                            <td style="padding: 30px 40px; border-top: 1px solid #2D3B55; text-align: center;">
                                <p style="margin: 0; color: #64748B; font-size: 12px;">
                                    This email was sent by {APP_NAME}.<br>
                                    If you didn't request this, please ignore this email.
                                </p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """


def new_user_email_template(admin_name: str, new_user_name: str, new_user_email: str, new_user_role: str) -> str:
    """Template for new user creation notification"""
    content = f"""
    <h1 style="margin: 0 0 20px 0; color: #F8FAFC; font-size: 24px;">New User Created</h1>
    <p style="margin: 0 0 20px 0; color: #94A3B8; font-size: 16px; line-height: 1.6;">
        Hello {admin_name},
    </p>
    <p style="margin: 0 0 30px 0; color: #94A3B8; font-size: 16px; line-height: 1.6;">
        A new user has been created under your account:
    </p>
    <table role="presentation" style="width: 100%; background-color: #0B1221; border-radius: 8px; padding: 20px; margin-bottom: 30px;">
        <tr>
            <td style="padding: 15px 20px;">
                <p style="margin: 0 0 10px 0; color: #64748B; font-size: 12px; text-transform: uppercase;">Name</p>
                <p style="margin: 0; color: #F8FAFC; font-size: 16px; font-weight: 600;">{new_user_name}</p>
            </td>
        </tr>
        <tr>
            <td style="padding: 15px 20px; border-top: 1px solid #2D3B55;">
                <p style="margin: 0 0 10px 0; color: #64748B; font-size: 12px; text-transform: uppercase;">Email</p>
                <p style="margin: 0; color: #F8FAFC; font-size: 16px;">{new_user_email}</p>
            </td>
        </tr>
        <tr>
            <td style="padding: 15px 20px; border-top: 1px solid #2D3B55;">
                <p style="margin: 0 0 10px 0; color: #64748B; font-size: 12px; text-transform: uppercase;">Role</p>
                <p style="margin: 0; color: #3B82F6; font-size: 16px; font-weight: 600;">{new_user_role.replace('_', ' ').title()}</p>
            </td>
        </tr>
    </table>
    <a href="{APP_URL}/admin" style="display: inline-block; padding: 14px 28px; background-color: #3B82F6; color: #FFFFFF; text-decoration: none; border-radius: 8px; font-weight: 600;">View Admin Panel</a>
    """
    return get_base_template(content, "New User Created")


def password_reset_email_template(user_name: str, reset_token: str) -> str:
    """Template for password reset email"""
    reset_url = f"{APP_URL}/reset-password?token={reset_token}"
    content = f"""
    <h1 style="margin: 0 0 20px 0; color: #F8FAFC; font-size: 24px;">Reset Your Password</h1>
    <p style="margin: 0 0 20px 0; color: #94A3B8; font-size: 16px; line-height: 1.6;">
        Hello {user_name},
    </p>
    <p style="margin: 0 0 30px 0; color: #94A3B8; font-size: 16px; line-height: 1.6;">
        We received a request to reset your password. Click the button below to create a new password:
    </p>
    <table role="presentation" style="width: 100%; margin-bottom: 30px;">
        <tr>
            <td align="center">
                <a href="{reset_url}" style="display: inline-block; padding: 14px 28px; background-color: #10B981; color: #FFFFFF; text-decoration: none; border-radius: 8px; font-weight: 600;">Reset Password</a>
            </td>
        </tr>
    </table>
    <p style="margin: 0 0 20px 0; color: #64748B; font-size: 14px; line-height: 1.6;">
        Or copy and paste this link into your browser:
    </p>
    <p style="margin: 0 0 30px 0; padding: 15px; background-color: #0B1221; border-radius: 8px; word-break: break-all;">
        <a href="{reset_url}" style="color: #3B82F6; text-decoration: none; font-size: 14px;">{reset_url}</a>
    </p>
    <table role="presentation" style="width: 100%; background-color: #F59E0B1A; border-radius: 8px; border: 1px solid #F59E0B33;">
        <tr>
            <td style="padding: 15px 20px;">
                <p style="margin: 0; color: #F59E0B; font-size: 14px;">
                    <strong>Security Notice:</strong> This link expires in 1 hour. If you didn't request a password reset, please ignore this email or contact support.
                </p>
            </td>
        </tr>
    </table>
    """
    return get_base_template(content, "Reset Your Password")


def budget_alert_email_template(user_name: str, campaign_name: str, campaign_id: str, percentage_used: float, remaining_budget: float) -> str:
    """Template for budget alert notification"""
    alert_color = "#EF4444" if percentage_used >= 90 else "#F59E0B"
    content = f"""
    <h1 style="margin: 0 0 20px 0; color: #F8FAFC; font-size: 24px;">Budget Alert</h1>
    <p style="margin: 0 0 20px 0; color: #94A3B8; font-size: 16px; line-height: 1.6;">
        Hello {user_name},
    </p>
    <p style="margin: 0 0 30px 0; color: #94A3B8; font-size: 16px; line-height: 1.6;">
        Your campaign budget is running low:
    </p>
    <table role="presentation" style="width: 100%; background-color: #0B1221; border-radius: 8px; margin-bottom: 30px;">
        <tr>
            <td style="padding: 20px;">
                <p style="margin: 0 0 10px 0; color: #64748B; font-size: 12px; text-transform: uppercase;">Campaign</p>
                <p style="margin: 0 0 20px 0; color: #F8FAFC; font-size: 18px; font-weight: 600;">{campaign_name}</p>
                
                <table role="presentation" style="width: 100%;">
                    <tr>
                        <td style="padding: 10px 0;">
                            <p style="margin: 0; color: #64748B; font-size: 12px;">Budget Used</p>
                            <p style="margin: 5px 0 0 0; color: {alert_color}; font-size: 24px; font-weight: 700;">{percentage_used:.1f}%</p>
                        </td>
                        <td style="padding: 10px 0; text-align: right;">
                            <p style="margin: 0; color: #64748B; font-size: 12px;">Remaining</p>
                            <p style="margin: 5px 0 0 0; color: #F8FAFC; font-size: 24px; font-weight: 700;">${remaining_budget:.2f}</p>
                        </td>
                    </tr>
                </table>
                
                <!-- Progress Bar -->
                <div style="margin-top: 15px; background-color: #2D3B55; border-radius: 4px; height: 8px; overflow: hidden;">
                    <div style="width: {min(percentage_used, 100)}%; background-color: {alert_color}; height: 100%;"></div>
                </div>
            </td>
        </tr>
    </table>
    <a href="{APP_URL}/campaigns/{campaign_id}/edit" style="display: inline-block; padding: 14px 28px; background-color: #3B82F6; color: #FFFFFF; text-decoration: none; border-radius: 8px; font-weight: 600;">Manage Campaign</a>
    """
    return get_base_template(content, "Budget Alert")


def suspicious_login_email_template(user_name: str, login_time: str, ip_address: str, user_agent: str, location: Optional[str] = None) -> str:
    """Template for suspicious login alert"""
    content = f"""
    <h1 style="margin: 0 0 20px 0; color: #F8FAFC; font-size: 24px;">New Login Detected</h1>
    <p style="margin: 0 0 20px 0; color: #94A3B8; font-size: 16px; line-height: 1.6;">
        Hello {user_name},
    </p>
    <p style="margin: 0 0 30px 0; color: #94A3B8; font-size: 16px; line-height: 1.6;">
        We detected a new sign-in to your account:
    </p>
    <table role="presentation" style="width: 100%; background-color: #0B1221; border-radius: 8px; margin-bottom: 30px;">
        <tr>
            <td style="padding: 15px 20px;">
                <p style="margin: 0 0 10px 0; color: #64748B; font-size: 12px; text-transform: uppercase;">Time</p>
                <p style="margin: 0; color: #F8FAFC; font-size: 16px;">{login_time}</p>
            </td>
        </tr>
        <tr>
            <td style="padding: 15px 20px; border-top: 1px solid #2D3B55;">
                <p style="margin: 0 0 10px 0; color: #64748B; font-size: 12px; text-transform: uppercase;">IP Address</p>
                <p style="margin: 0; color: #F8FAFC; font-size: 16px;">{ip_address}</p>
            </td>
        </tr>
        {f'''<tr>
            <td style="padding: 15px 20px; border-top: 1px solid #2D3B55;">
                <p style="margin: 0 0 10px 0; color: #64748B; font-size: 12px; text-transform: uppercase;">Location</p>
                <p style="margin: 0; color: #F8FAFC; font-size: 16px;">{location}</p>
            </td>
        </tr>''' if location else ''}
        <tr>
            <td style="padding: 15px 20px; border-top: 1px solid #2D3B55;">
                <p style="margin: 0 0 10px 0; color: #64748B; font-size: 12px; text-transform: uppercase;">Device</p>
                <p style="margin: 0; color: #94A3B8; font-size: 14px; word-break: break-word;">{user_agent[:100]}...</p>
            </td>
        </tr>
    </table>
    <table role="presentation" style="width: 100%; background-color: #EF44441A; border-radius: 8px; border: 1px solid #EF444433; margin-bottom: 30px;">
        <tr>
            <td style="padding: 15px 20px;">
                <p style="margin: 0; color: #EF4444; font-size: 14px;">
                    <strong>Wasn't you?</strong> If you didn't sign in, we recommend changing your password immediately and enabling two-factor authentication.
                </p>
            </td>
        </tr>
    </table>
    <a href="{APP_URL}/admin" style="display: inline-block; padding: 14px 28px; background-color: #3B82F6; color: #FFFFFF; text-decoration: none; border-radius: 8px; font-weight: 600;">Review Account Security</a>
    """
    return get_base_template(content, "New Login Detected")


def creative_approval_email_template(user_name: str, creative_name: str, creative_id: str, creative_type: str, status: str, feedback: Optional[str] = None) -> str:
    """Template for creative approval/rejection notification"""
    is_approved = status == "approved"
    status_color = "#10B981" if is_approved else "#F59E0B"
    status_text = "Approved" if is_approved else "Changes Requested"
    status_icon = "✓" if is_approved else "⚠"
    
    feedback_section = ""
    if feedback:
        feedback_section = f"""
        <tr>
            <td style="padding: 15px 20px; border-top: 1px solid #2D3B55;">
                <p style="margin: 0 0 10px 0; color: #64748B; font-size: 12px; text-transform: uppercase;">Feedback</p>
                <p style="margin: 0; color: #F8FAFC; font-size: 14px; line-height: 1.6; white-space: pre-wrap;">{feedback}</p>
            </td>
        </tr>
        """
    
    content = f"""
    <h1 style="margin: 0 0 20px 0; color: #F8FAFC; font-size: 24px;">Creative {status_text}</h1>
    <p style="margin: 0 0 20px 0; color: #94A3B8; font-size: 16px; line-height: 1.6;">
        Hello {user_name},
    </p>
    <p style="margin: 0 0 30px 0; color: #94A3B8; font-size: 16px; line-height: 1.6;">
        An advertiser has reviewed your creative and provided their response:
    </p>
    
    <!-- Status Badge -->
    <table role="presentation" style="width: 100%; margin-bottom: 20px;">
        <tr>
            <td align="center">
                <span style="display: inline-block; padding: 10px 24px; background-color: {status_color}22; color: {status_color}; border-radius: 20px; font-size: 18px; font-weight: 600;">
                    {status_icon} {status_text}
                </span>
            </td>
        </tr>
    </table>
    
    <table role="presentation" style="width: 100%; background-color: #0B1221; border-radius: 8px; margin-bottom: 30px;">
        <tr>
            <td style="padding: 15px 20px;">
                <p style="margin: 0 0 10px 0; color: #64748B; font-size: 12px; text-transform: uppercase;">Creative Name</p>
                <p style="margin: 0; color: #F8FAFC; font-size: 18px; font-weight: 600;">{creative_name}</p>
            </td>
        </tr>
        <tr>
            <td style="padding: 15px 20px; border-top: 1px solid #2D3B55;">
                <p style="margin: 0 0 10px 0; color: #64748B; font-size: 12px; text-transform: uppercase;">Creative Type</p>
                <p style="margin: 0; color: #3B82F6; font-size: 16px;">{creative_type.replace('_', ' ').title()}</p>
            </td>
        </tr>
        <tr>
            <td style="padding: 15px 20px; border-top: 1px solid #2D3B55;">
                <p style="margin: 0 0 10px 0; color: #64748B; font-size: 12px; text-transform: uppercase;">Creative ID</p>
                <p style="margin: 0; color: #94A3B8; font-size: 12px; font-family: monospace;">{creative_id}</p>
            </td>
        </tr>
        {feedback_section}
    </table>
    
    {'<p style="margin: 0 0 30px 0; color: #10B981; font-size: 16px;">Your creative is ready to go live!</p>' if is_approved else '<p style="margin: 0 0 30px 0; color: #F59E0B; font-size: 16px;">Please review the feedback and make the necessary changes.</p>'}
    
    <a href="{APP_URL}/creative-editor/{creative_id}" style="display: inline-block; padding: 14px 28px; background-color: #3B82F6; color: #FFFFFF; text-decoration: none; border-radius: 8px; font-weight: 600;">{'View Creative' if is_approved else 'Edit Creative'}</a>
    """
    return get_base_template(content, f"Creative {status_text}: {creative_name}")


# ============== EMAIL SENDING FUNCTIONS ==============

async def send_email(to_email: str, subject: str, html_content: str) -> Dict[str, Any]:
    """
    Send an email using Resend API.
    Returns dict with status, message, and email_id if successful.
    """
    if not RESEND_API_KEY:
        logger.info(f"[EMAIL LOG] To: {to_email}, Subject: {subject}")
        return {"status": "logged", "message": "Email logged (no API key configured)"}
    
    params = {
        "from": SENDER_EMAIL,
        "to": [to_email],
        "subject": subject,
        "html": html_content
    }
    
    try:
        # Run sync SDK in thread to keep FastAPI non-blocking
        email = await asyncio.to_thread(resend.Emails.send, params)
        logger.info(f"Email sent to {to_email}: {subject}")
        return {
            "status": "success",
            "message": f"Email sent to {to_email}",
            "email_id": email.get("id")
        }
    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {str(e)}")
        return {
            "status": "error",
            "message": str(e)
        }


async def send_new_user_notification(admin_email: str, admin_name: str, new_user_name: str, new_user_email: str, new_user_role: str, admin_id: str = None):
    """Send notification to admin when a new user is created under them"""
    # Check preferences if admin_id provided
    if admin_id:
        from routers.auth import should_send_notification
        if not await should_send_notification(admin_id, "new_user"):
            logger.info(f"New user notification skipped for {admin_email} (disabled in preferences)")
            return {"status": "skipped", "message": "Notification disabled in user preferences"}
    
    subject = f"New {new_user_role.replace('_', ' ').title()} Created: {new_user_name}"
    html_content = new_user_email_template(admin_name, new_user_name, new_user_email, new_user_role)
    return await send_email(admin_email, subject, html_content)


async def send_password_reset_email(user_email: str, user_name: str, reset_token: str, user_id: str = None):
    """Send password reset email with token"""
    # Password reset emails are always sent (security critical)
    # But we still log the preference check
    if user_id:
        from routers.auth import should_send_notification
        should_send = await should_send_notification(user_id, "password_reset")
        if not should_send:
            logger.info(f"Password reset notification for {user_email} - preferences disabled but sending anyway (security)")
    
    subject = f"Reset Your {APP_NAME} Password"
    html_content = password_reset_email_template(user_name, reset_token)
    return await send_email(user_email, subject, html_content)


async def send_budget_alert(user_email: str, user_name: str, campaign_name: str, campaign_id: str, percentage_used: float, remaining_budget: float, user_id: str = None):
    """Send budget alert notification"""
    # Check preferences if user_id provided
    if user_id:
        from routers.auth import should_send_notification, get_budget_thresholds
        if not await should_send_notification(user_id, "budget"):
            logger.info(f"Budget alert skipped for {user_email} (disabled in preferences)")
            return {"status": "skipped", "message": "Budget alerts disabled in user preferences"}
        
        # Get custom thresholds
        warning_threshold, critical_threshold = await get_budget_thresholds(user_id)
        
        # Check if this alert should be sent based on thresholds
        if percentage_used < warning_threshold:
            return {"status": "skipped", "message": f"Budget ({percentage_used}%) below warning threshold ({warning_threshold}%)"}
    else:
        warning_threshold, critical_threshold = 75, 90
    
    alert_type = "Critical" if percentage_used >= critical_threshold else "Warning"
    subject = f"[{alert_type}] Campaign Budget Alert: {campaign_name}"
    html_content = budget_alert_email_template(user_name, campaign_name, campaign_id, percentage_used, remaining_budget)
    return await send_email(user_email, subject, html_content)


async def send_suspicious_login_alert(user_email: str, user_name: str, ip_address: str, user_agent: str, location: Optional[str] = None, user_id: str = None):
    """Send suspicious login alert"""
    # Security alerts are critical but can still be checked
    if user_id:
        from routers.auth import should_send_notification
        if not await should_send_notification(user_id, "security"):
            logger.info(f"Security alert skipped for {user_email} (disabled in preferences)")
            return {"status": "skipped", "message": "Security alerts disabled in user preferences"}
    
    login_time = datetime.now(timezone.utc).strftime("%B %d, %Y at %I:%M %p UTC")
    subject = f"New Sign-in to Your {APP_NAME} Account"
    html_content = suspicious_login_email_template(user_name, login_time, ip_address, user_agent, location)
    return await send_email(user_email, subject, html_content)


async def send_creative_approval_notification(
    user_email: str, 
    user_name: str, 
    creative_name: str, 
    creative_id: str, 
    creative_type: str,
    status: str,  # 'approved' or 'rejected'
    feedback: Optional[str] = None
):
    """Send notification when creative is approved or changes are requested"""
    status_text = "Approved" if status == "approved" else "Changes Requested"
    subject = f"Creative {status_text}: {creative_name}"
    html_content = creative_approval_email_template(
        user_name, creative_name, creative_id, creative_type, status, feedback
    )
    return await send_email(user_email, subject, html_content)

