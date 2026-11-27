"use client";

import Link from "next/link";
import { useI18n } from "../../lib/i18n";
import Icon, { type IconName } from "./Icon";

type Copy = {
  intro: string;
  contactTitle: string;
  email: string;
  phone: string;
  github: string;
  githubHint: string;
  pending: string;
  response: string;
  responseValue: string;
  reportTitle: string;
  reportLead: string;
  report: string[];
  helpTitle: string;
  help: { icon: IconName; title: string; body: string; solution: string }[];
  guide: string;
};

const content: Record<"en" | "vi", Copy> = {
  en: {
    intro: "Need assistance with repository analysis, evidence inspection, or configuring your custom LLM API? We are here to help.",
    contactTitle: "Contact & Support",
    email: "Support email",
    phone: "Hotline",
    github: "Issue Tracker",
    githubHint: "Open an issue on GitHub",
    pending: "Configured via .env",
    response: "Response time",
    responseValue: "Within 24 business hours",
    reportTitle: "Submitting a Diagnostic Report",
    reportLead: "Please provide the following details to help us diagnose issues quickly:",
    report: [
      "The repository GitHub URL and target commit SHA (if shown).",
      "The specific analysis tab where the issue occurred.",
      "The exact error message or HTTP status code.",
      "Your browser version and sign-in status.",
    ],
    helpTitle: "Troubleshooting & Solutions",
    help: [
      {
        icon: "refresh",
        title: "Analysis is stuck or timed out",
        body: "Indexing time depends on repository size, network and parser workload.",
        solution: "Click 'Resync' on the repository header. If it fails, check that the GitHub URL is public and valid.",
      },
      {
        icon: "search",
        title: "Answer says 'Insufficient Evidence'",
        body: "The AI Code Inspector uses source evidence to reduce unsupported answers.",
        solution: "Be specific: mention an exact file path, function name, or module. The AI only answers when cited code verifies it.",
      },
      {
        icon: "repository",
        title: "Repository not saved in Library",
        body: "Repositories analyzed as an anonymous guest are not linked to a personal workspace.",
        solution: "Sign in with Google, GitHub, or Magic Link first, then reopen or re-analyze the repository.",
      },
      {
        icon: "shield",
        title: "AI Analysis is disabled or unavailable",
        body: "The API key, model, quota, or provider connection may be invalid.",
        solution: "Add your Gemini or OpenAI API key to your .env file and recreate the backend container. See the User Guide for step-by-step instructions.",
      },
    ],
    guide: "View Step-by-Step User Guide",
  },
  vi: {
    intro: "Bạn cần hỗ trợ phân tích kho mã, thẩm tra bằng chứng, hoặc hướng dẫn cấu hình API AI? Hãy tham khảo các mục bên dưới.",
    contactTitle: "Kênh hỗ trợ kỹ thuật",
    email: "Email hỗ trợ",
    phone: "Đường dây nóng",
    github: "Báo lỗi trên GitHub",
    githubHint: "Mở một Issue mới",
    pending: "Cấu hình qua .env",
    response: "Thời gian phản hồi",
    responseValue: "Trong vòng 24 giờ làm việc",
    reportTitle: "Khi cần báo cáo sự cố",
    reportLead: "Các thông tin sau giúp chẩn đoán và khắc phục nhanh nhất:",
    report: [
      "Đường dẫn GitHub của kho mã và commit SHA (nếu có).",
      "Tab phân tích cụ thể gặp vấn đề (Mã nguồn, Đồ thị, Nợ kỹ thuật, v.v.).",
      "Nguyên văn thông báo lỗi hoặc mã HTTP hiển thị.",
      "Trình duyệt đang sử dụng và việc bạn đã đăng nhập hay chưa.",
    ],
    helpTitle: "Các trường hợp thường gặp & Cách xử lý",
    help: [
      {
        icon: "refresh",
        title: "Phân tích bị treo hoặc quá thời gian",
        body: "Thời gian phân tích phụ thuộc kích thước kho mã, mạng và tải bộ phân tích.",
        solution: "Bấm 'Đồng bộ lại' ở đầu trang kho mã. Kiểm tra xem đường dẫn GitHub có phải là công khai hay không.",
      },
      {
        icon: "search",
        title: "AI báo 'Chưa đủ bằng chứng'",
        body: "Hệ thống tuân thủ nguyên lý Evidence-first, giảm nguy cơ trả lời thiếu căn cứ.",
        solution: "Hãy hỏi cụ thể: nêu rõ tên file, tên class hoặc hàm. AI chỉ kết luận khi có bằng chứng code xác thực.",
      },
      {
        icon: "repository",
        title: "Không thấy kho mã trong Thư viện",
        body: "Kho mã phân tích ở chế độ khách vãng lai (chưa đăng nhập) sẽ không được lưu vào workspace.",
        solution: "Hãy đăng nhập bằng Google, GitHub hoặc Magic Link trước, sau đó phân tích để lưu vĩnh viễn vào Thư viện.",
      },
      {
        icon: "shield",
        title: "Tính năng AI chưa hoạt động",
        body: "Có thể thiếu API Key, sai tên mô hình, hết hạn mức hoặc lỗi kết nối nhà cung cấp.",
        solution: "Mở tệp .env, điền Gemini hoặc OpenAI API key và tạo lại container backend. Xem mục Hướng dẫn để biết chi tiết từng bước.",
      },
    ],
    guide: "Xem Hướng Dẫn Sử Dụng Từng Bước",
  },
};

export default function SupportSection({ email, phone, github }: { email?: string; phone?: string; github?: string }) {
  const { locale } = useI18n();
  const copy = content[locale];
  const issueUrl = github && /^https:\/\/github\.com\//i.test(github) ? github.replace(/\/+$/, "") + "/issues/new" : "";

  return (
    <section id="support" className="support-band" aria-labelledby="support-heading">
      <div className="wrap resource-page">
        <header className="resource-head">
          <h2 id="support-heading">{copy.contactTitle}</h2>
          <p>{copy.intro}</p>
        </header>

        <div className="contact-layout">
          <section className="contact-feature">
            <h3>{copy.contactTitle}</h3>
            <dl className="contact-methods">
              <div>
                <dt><Icon name="mail" />{copy.email}</dt>
                <dd>{email ? <a href={`mailto:${email}`}>{email}</a> : copy.pending}</dd>
              </div>
              <div>
                <dt><Icon name="phone" />{copy.phone}</dt>
                <dd>{phone ? <a href={`tel:${phone}`}>{phone}</a> : copy.pending}</dd>
              </div>
              <div>
                <dt><Icon name="github" />{copy.github}</dt>
                <dd>{issueUrl ? <a href={issueUrl} target="_blank" rel="noopener noreferrer">{copy.githubHint}</a> : copy.pending}</dd>
              </div>
              <div>
                <dt><Icon name="clock" />{copy.response}</dt>
                <dd>{copy.responseValue}</dd>
              </div>
            </dl>
          </section>

          <aside className="resource-aside">
            <Icon name="quote" size={24} />
            <h3>{copy.reportTitle}</h3>
            <p>{copy.reportLead}</p>
            <ul className="tick-list">
              {copy.report.map(item => (
                <li key={item}>
                  <Icon name="check" size={16} />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <Link className="text-action resource-link" href="/guide">
              {copy.guide}
              <Icon name="arrow" size={15} />
            </Link>
          </aside>
        </div>

        <section className="rs-section" aria-labelledby="support-help">
          <h3 id="support-help" className="block-title">{copy.helpTitle}</h3>
          <div className="card-grid cols-2">
            {copy.help.map(({ icon, title, body, solution }) => (
              <article key={title} className="info-card help-solution-card">
                <div className="help-card-header">
                  <Icon name={icon} size={22} />
                  <h4>{title}</h4>
                </div>
                <p className="help-body">{body}</p>
                <div className="help-solution">
                  <strong>{locale === "vi" ? "Cách xử lý:" : "Solution:"}</strong>
                  <span>{solution}</span>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}
