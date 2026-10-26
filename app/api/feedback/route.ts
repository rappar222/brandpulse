import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      message,
      category = "bug",
      userEmail,
      screenshot,
      isRedacted = false,
      metadata = {},
    } = body;

    if (!message || typeof message !== "string" || !message.trim()) {
      return NextResponse.json(
        { error: "Please provide a description of your issue or feedback." },
        { status: 400 }
      );
    }

    const gmailUser = process.env.FEEDBACK_GMAIL_USER || "rappar2018@gmail.com";
    const gmailPass = process.env.FEEDBACK_GMAIL_APP_PASSWORD || "qelakybgfjszgmxl";
    const receiverEmail = process.env.FEEDBACK_RECEIVER_EMAIL || "feedback@polychroms.dev";

    if (!gmailPass) {
      return NextResponse.json(
        { error: "Gmail App Password is not configured on the server." },
        { status: 500 }
      );
    }

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: gmailUser,
        pass: gmailPass,
      },
    });

    const categoryLabels: Record<string, { label: string; emoji: string }> = {
      bug: { label: "Bug Report", emoji: "🐛" },
      feature: { label: "Feature Suggestion", emoji: "💡" },
      design: { label: "Design / UI Issue", emoji: "🎨" },
      other: { label: "General Feedback", emoji: "💬" },
    };

    const catInfo = categoryLabels[category] || categoryLabels.other;
    const dateFormatted = new Date().toLocaleString("en-US", {
      timeZoneName: "short",
    });

    const rawQuery = metadata.query ? String(metadata.query).trim() : "";

    // If redacted, completely hide the company/search query from subject line and metadata
    let emailSubject = `[PulsarCheck Feedback] ${catInfo.emoji} ${catInfo.label}`;
    if (isRedacted) {
      emailSubject += ` [Company Redacted]`;
    } else if (rawQuery) {
      emailSubject += ` (${rawQuery})`;
    }

    let sanitizedQuery = rawQuery;
    let sanitizedUrl = metadata.url ? String(metadata.url) : "";
    let sanitizedMessage = message.trim();

    if (isRedacted) {
      sanitizedQuery = "[REDACTED FOR COMPANY PRIVACY]";
      if (sanitizedUrl) {
        try {
          const parsedUrl = new URL(sanitizedUrl);
          if (parsedUrl.searchParams.has("q")) {
            parsedUrl.searchParams.set("q", "[REDACTED]");
            sanitizedUrl = parsedUrl.toString();
          }
        } catch {
          sanitizedUrl = sanitizedUrl.replace(/([?&]q=)[^&]+/i, "$1[REDACTED]");
        }
      }
      if (rawQuery && rawQuery.length >= 2) {
        const escaped = rawQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        sanitizedMessage = sanitizedMessage.replace(new RegExp(escaped, "gi"), "[REDACTED COMPANY]");
      }
    }

    // Parse attachments if screenshot exists
    const attachments: Array<{
      filename: string;
      content: Buffer;
      contentType: string;
      cid?: string;
    }> = [];

    let hasScreenshot = false;
    if (screenshot && typeof screenshot === "string" && screenshot.startsWith("data:image/")) {
      const base64Data = screenshot.replace(/^data:image\/\w+;base64,/, "");
      const imageBuffer = Buffer.from(base64Data, "base64");
      attachments.push({
        filename: `pulsarcheck-feedback-${Date.now()}.png`,
        content: imageBuffer,
        contentType: "image/png",
        cid: "feedback-screenshot-image",
      });
      hasScreenshot = true;
    }

    const htmlContent = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 680px; margin: 0 auto; padding: 24px; background-color: #f8fafc; border-radius: 16px;">
        <div style="background-color: #ffffff; padding: 28px; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
          
          <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #edf2f7; padding-bottom: 16px; margin-bottom: 20px;">
            <div style="font-size: 20px; font-weight: 800; color: #1e293b;">
              PulsarCheck User Feedback
            </div>
            <span style="display: inline-block; padding: 4px 12px; background-color: #ede9fe; color: #6d28d9; border-radius: 20px; font-size: 12px; font-weight: 700;">
              ${catInfo.emoji} ${catInfo.label}
            </span>
          </div>

          <div style="margin-bottom: 24px;">
            <div style="font-size: 12px; text-transform: uppercase; color: #64748b; font-weight: 700; letter-spacing: 0.5px; margin-bottom: 6px;">
              Feedback Description
            </div>
            <div style="font-size: 15px; line-height: 1.6; color: #0f172a; background-color: #f1f5f9; padding: 16px; border-radius: 8px; border-left: 4px solid #6366f1; white-space: pre-wrap;">
${sanitizedMessage}
            </div>
          </div>

          ${
            isRedacted
              ? `
          <div style="margin-bottom: 20px; padding: 12px 16px; background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px;">
            <div style="font-size: 13px; font-weight: 700; color: #166534; display: flex; align-items: center; gap: 6px;">
              🛡️ Company Privacy Protection Active
            </div>
            <div style="font-size: 12px; color: #15803d; margin-top: 4px;">
              Company identity and domain search queries were automatically blacked out and omitted from subject line and metadata.
            </div>
          </div>
          `
              : ""
          }

          ${
            userEmail
              ? `
          <div style="margin-bottom: 20px; padding: 12px 16px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;">
            <span style="font-size: 12px; font-weight: 700; color: #64748b;">User Contact:</span>
            <a href="mailto:${userEmail}" style="font-size: 13px; color: #4f46e5; font-weight: 600; text-decoration: none; margin-left: 8px;">${userEmail}</a>
          </div>
          `
              : ""
          }

          ${
            hasScreenshot
              ? `
          <div style="margin-bottom: 24px;">
            <div style="font-size: 12px; text-transform: uppercase; color: #64748b; font-weight: 700; letter-spacing: 0.5px; margin-bottom: 8px;">
              Annotated Screenshot
            </div>
            <div style="text-align: center; background-color: #0f172a; padding: 12px; border-radius: 8px; border: 1px solid #cbd5e1;">
              <img src="cid:feedback-screenshot-image" alt="User Screenshot with Annotations" style="max-width: 100%; height: auto; border-radius: 4px; display: block; margin: 0 auto;" />
            </div>
            <div style="font-size: 11px; color: #64748b; margin-top: 6px; text-align: center;">
              (Also attached as PNG file to this email for full resolution inspection)
            </div>
          </div>
          `
              : ""
          }

          <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e2e8f0;">
            <div style="font-size: 12px; text-transform: uppercase; color: #64748b; font-weight: 700; letter-spacing: 0.5px; margin-bottom: 10px;">
              Diagnostics & Metadata
            </div>
            <table style="width: 100%; font-size: 12px; color: #334155; border-collapse: collapse;">
              <tr>
                <td style="padding: 4px 0; color: #64748b; width: 140px; font-weight: 600;">Timestamp:</td>
                <td style="padding: 4px 0; font-family: monospace;">${dateFormatted}</td>
              </tr>
              ${
                sanitizedUrl
                  ? `<tr>
                <td style="padding: 4px 0; color: #64748b; font-weight: 600;">Page URL:</td>
                <td style="padding: 4px 0; font-family: monospace; word-break: break-all;">${sanitizedUrl}</td>
              </tr>`
                  : ""
              }
              ${
                sanitizedQuery
                  ? `<tr>
                <td style="padding: 4px 0; color: #64748b; font-weight: 600;">Active Query:</td>
                <td style="padding: 4px 0; font-family: monospace; font-weight: 700; color: ${isRedacted ? "#dc2626" : "#4f46e5"};">${sanitizedQuery}</td>
              </tr>`
                  : ""
              }
              ${
                metadata.resolution
                  ? `<tr>
                <td style="padding: 4px 0; color: #64748b; font-weight: 600;">Screen Size:</td>
                <td style="padding: 4px 0; font-family: monospace;">${metadata.resolution}</td>
              </tr>`
                  : ""
              }
              ${
                metadata.userAgent
                  ? `<tr>
                <td style="padding: 4px 0; color: #64748b; font-weight: 600;">User Agent:</td>
                <td style="padding: 4px 0; font-family: monospace; font-size: 11px; word-break: break-all;">${metadata.userAgent}</td>
              </tr>`
                  : ""
              }
            </table>
          </div>

        </div>
        <div style="text-align: center; margin-top: 16px; font-size: 11px; color: #94a3b8;">
          PulsarCheck Automated In-App Feedback System • Delivered via Gmail SMTP
        </div>
      </div>
    `;

    await transporter.sendMail({
      from: `"PulsarCheck Feedback" <${gmailUser}>`,
      to: receiverEmail,
      replyTo: userEmail || gmailUser,
      subject: emailSubject,
      html: htmlContent,
      attachments,
    });

    return NextResponse.json({
      ok: true,
      message: "Your feedback has been sent directly to the development team!",
    });
  } catch (error: any) {
    console.error("Feedback email error:", error);
    return NextResponse.json(
      {
        error: error?.message || "Failed to deliver feedback email via Gmail. Please try again.",
      },
      { status: 500 }
    );
  }
}
