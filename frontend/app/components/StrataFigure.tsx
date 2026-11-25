import Image from "next/image";
import { useI18n } from "../../lib/i18n";
import Icon from "./Icon";

export default function StrataFigure() {
  const { locale } = useI18n();
  const vi = locale === "vi";
  return (
    <figure className="strata">
      <div className="figure-field">
        <Image src="/strata.webp" width={1200} height={764} alt="" priority unoptimized />
      </div>
      <figcaption><Icon name="layers" size={15} /> {vi ? "Mặt cắt minh họa kho mã" : "Repository cross-section"}</figcaption>
    </figure>
  );
}
