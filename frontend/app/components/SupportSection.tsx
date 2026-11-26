"use client";

import Link from "next/link";
import { useI18n } from "../../lib/i18n";
import Icon, { type IconName } from "./Icon";

// Edit this list to publish the team. Leave `name` empty to show a placeholder.
const TEAM: { name: string; role: { en: string; vi: string } }[] = [
  { name: "Phạm Văn Sáng", role: { en: "Frontend and product UI", vi: "Giao diện và trải nghiệm người dùng" } },
  { name: "Lê Đức Anh", role: { en: "Backend API and data", vi: "API backend và dữ liệu" } },
  { name: "Nguyễn Thảo Ngoan", role: { en: "Parser, RAG and graph", vi: "Phân tích mã, RAG và đồ thị" } },
];

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
  teamTitle: string;
  teamPending: string;
  reportTitle: string;
  reportLead: string;
  report: string[];
  helpTitle: string;
  help: { icon: IconName; title: string; body: string }[];
  guide: string;
};

const content: Record<"en" | "vi", Copy> = {
  en: {
    intro: "Contact the project team for help signing in, analyzing a repository or reading your results.",
    contactTitle: "Contact details",
    email: "Support email",
    phone: "Phone",
    github: "Issue tracker",
    githubHint: "Open an issue on GitHub",
    pending: "Coming soon",
    response: "Response time",
    responseValue: "Within 1 to 2 working days",
    teamTitle: "Project team",
    teamPending: "Name to be added",
    reportTitle: "When you report an issue",
    reportLead: "These details help us reproduce the problem quickly:",
    report: [
      "The page you were on and what you did just before.",
      "The exact message you saw, or a screenshot.",
      "The GitHub URL of the repository and, if shown, the commit SHA.",
      "Your browser and whether you were signed in.",
    ],
    helpTitle: "Quick fixes",
    help: [
      { icon: "refresh", title: "Analysis is stuck or failed", body: "Open the repository and select Re-analyze. Very large repositories can exceed the clone time limit." },
      { icon: "search", title: "Answer says insufficient evidence", body: "Ask about a specific file or function. The repository may simply not contain the answer." },
      { icon: "repository", title: "Repository missing from the Library", body: "The Library lists repositories analyzed while you were signed in. Sign in, then analyze it again." },
      { icon: "shield", title: "Cannot connect or sign in", body: "Check that the backend is running. GitHub and Google sign-in only work after the administrator configures OAuth." },
    ],
    guide: "User guide",
  },
  vi: {
    intro: "Liên hệ với nhóm dự án nếu bạn gặp khó khăn khi đăng nhập, phân tích kho mã hoặc đọc kết quả.",
    contactTitle: "Thông tin liên hệ",
    email: "Email hỗ trợ",
    phone: "Điện thoại",
    github: "Báo lỗi trên GitHub",
    githubHint: "Mở một issue mới",
    pending: "Đang cập nhật",
    response: "Thời gian phản hồi",
    responseValue: "Trong 1 đến 2 ngày làm việc",
    teamTitle: "Nhóm thực hiện",
    teamPending: "Họ và tên sẽ được bổ sung",
    reportTitle: "Khi báo lỗi",
    reportLead: "Những thông tin sau giúp nhóm tái hiện lỗi nhanh hơn:",
    report: [
      "Trang bạn đang xem và thao tác vừa thực hiện.",
      "Nguyên văn thông báo hiển thị, hoặc ảnh chụp màn hình.",
      "Đường dẫn GitHub của kho mã và mã commit nếu có.",
      "Trình duyệt bạn dùng và việc đã đăng nhập hay chưa.",
    ],
    helpTitle: "Cách xử lý nhanh",
    help: [
      { icon: "refresh", title: "Phân tích bị treo hoặc thất bại", body: "Mở kho mã và nhấn Phân tích lại. Kho quá lớn có thể vượt giới hạn thời gian tải." },
      { icon: "search", title: "Câu trả lời báo thiếu bằng chứng", body: "Hãy hỏi về một tệp hoặc hàm cụ thể. Có thể kho mã không chứa câu trả lời." },
      { icon: "repository", title: "Không thấy kho trong Thư viện", body: "Thư viện chỉ liệt kê kho được phân tích khi bạn đã đăng nhập. Hãy đăng nhập rồi phân tích lại." },
      { icon: "shield", title: "Không kết nối hoặc không đăng nhập được", body: "Kiểm tra backend đã chạy chưa. Đăng nhập GitHub hoặc Google chỉ hoạt động khi quản trị viên đã cấu hình OAuth." },
    ],
    guide: "Hướng dẫn sử dụng",
  },
};

export default function SupportSection({ email, phone, github }: { email?: string; phone?: string; github?: string }) {
  const { locale, t } = useI18n();
  const copy = content[locale];
  const issueUrl = github && /^https:\/\/github\.com\//i.test(github) ? github.replace(/\/+$/, "") + "/issues/new" : "";
  return <section id="support" className="support-band" aria-labelledby="support-heading">
  <div className="wrap resource-page">
    <header className="resource-head">
      <h2 id="support-heading">{t.supportTitle}</h2>
      <p>{copy.intro}</p>
    </header>

    <div className="contact-layout">
      <section className="contact-feature">
        <h3>{copy.contactTitle}</h3>
        <dl className="contact-methods">
          <div><dt><Icon name="mail" />{copy.email}</dt>
            <dd>{email ? <a href={"mailto:" + email}>{email}</a> : copy.pending}</dd></div>
          <div><dt><Icon name="phone" />{copy.phone}</dt>
            <dd>{phone ? <a href={"tel:" + phone.replace(/[^+\d]/g, "")}>{phone}</a> : copy.pending}</dd></div>
          <div><dt><Icon name="github" />{copy.github}</dt>
            <dd>{issueUrl ? <a href={issueUrl} target="_blank" rel="noopener noreferrer">{copy.githubHint}</a> : copy.pending}</dd></div>
          <div><dt><Icon name="clock" />{copy.response}</dt>
            <dd>{copy.responseValue}</dd></div>
        </dl>
      </section>
      <aside className="resource-aside">
        <Icon name="quote" size={24} />
        <h3>{copy.reportTitle}</h3>
        <p>{copy.reportLead}</p>
        <ul className="tick-list">
          {copy.report.map(item => <li key={item}><Icon name="check" size={16} /><span>{item}</span></li>)}
        </ul>
        <Link className="text-action resource-link" href="/guide">{copy.guide}<Icon name="arrow" size={15} /></Link>
      </aside>
    </div>

    <section className="rs-section" aria-labelledby="support-help">
      <h3 id="support-help" className="block-title">{copy.helpTitle}</h3>
      <div className="card-grid cols-4">
        {copy.help.map(({ icon, title, body }) => (
          <article key={title} className="info-card">
            <Icon name={icon} size={20} />
            <h4>{title}</h4>
            <p>{body}</p>
          </article>
        ))}
      </div>
    </section>

    <section className="rs-section" aria-labelledby="support-team">
      <h3 id="support-team" className="block-title">{copy.teamTitle}</h3>
      <ul className="team-grid">
        {TEAM.map((member, i) => (
          <li key={i} className="team-card">
            <span className="avatar" aria-hidden="true"><Icon name="user" size={20} /></span>
            <div>
              <strong>{member.name || copy.teamPending}</strong>
              <small>{member.role[locale]}</small>
            </div>
          </li>
        ))}
      </ul>
    </section>
  </div>
  </section>;
}
