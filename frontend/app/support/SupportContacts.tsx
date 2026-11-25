"use client";

import Link from "next/link";
import { useI18n } from "../../lib/i18n";
import Icon from "../components/Icon";

export default function SupportContacts({ email, phone }: { email?: string; phone?: string }) {
  const { locale, t } = useI18n();
  const vi = locale === "vi";
  const pending = vi ? "Đang cập nhật" : "Coming soon";
  return <article id="support" className="wrap resource-page" aria-labelledby="support-heading">
    <header className="resource-head">
      <h1 id="support-heading">{t.supportTitle}</h1>
      <p>{vi ? "Liên hệ với nhóm dự án nếu bạn gặp khó khăn khi đăng nhập, phân tích kho mã hoặc đọc kết quả." : "Contact the project team for help signing in, analyzing a repository or reading your results."}</p>
    </header>
    <div className="contact-layout">
      <section className="contact-feature">
        <h2>{vi ? "Thông tin liên hệ" : "Contact details"}</h2>
        <dl className="contact-methods">
          <div><dt><Icon name="mail"/>{vi ? "Email hỗ trợ" : "Support email"}</dt>
            <dd>{email ? <a href={"mailto:" + email}>{email}</a> : pending}</dd></div>
          <div><dt><Icon name="phone"/>{vi ? "Điện thoại" : "Phone"}</dt>
            <dd>{phone ? <a href={"tel:" + phone.replace(/[^+\d]/g, "")}>{phone}</a> : pending}</dd></div>
        </dl>
      </section>
      <aside className="resource-aside">
        <Icon name="quote" size={24}/>
        <h2>{vi ? "Khi báo lỗi" : "Reporting an issue"}</h2>
        <p>{vi ? "Cho nhóm biết bạn đang ở trang nào, vừa thực hiện bước gì và thấy thông báo nào. Nếu lỗi xảy ra khi phân tích kho công khai, hãy gửi kèm đường dẫn kho." : "Tell us which page you were on, what you did and any message you saw. For an analysis issue with a public repository, include its GitHub URL."}</p>
        <Link className="text-action resource-link" href="/guide">{t.guideTitle}<Icon name="arrow" size={15}/></Link>
      </aside>
    </div>
  </article>;
}
