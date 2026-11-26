"use client";

import { useEffect, useState } from "react";
import { useI18n } from "../../lib/i18n";
import Icon from "./Icon";

const tones = [
  { id: "forest", en: "Forest green", vi: "Xanh lá" },
  { id: "ocean", en: "Ocean blue", vi: "Xanh biển" },
  { id: "iris", en: "Iris purple", vi: "Tím diên vĩ" },
  { id: "amber", en: "Amber", vi: "Hổ phách" },
];

export default function TonePicker() {
  const { locale } = useI18n();
  const [tone, setTone] = useState("forest");
  const label = locale === "vi" ? "Tông màu" : "Color palette";

  useEffect(() => {
    const saved = document.documentElement.dataset.tone;
    if (saved && tones.some(option => option.id === saved)) setTone(saved);
  }, []);

  function choose(value: string) {
    setTone(value);
    document.documentElement.dataset.tone = value;
    try { localStorage.setItem("tone", value); } catch {}
  }

  return <label className="tone-picker" title={label}>
    <Icon name="palette" size={18}/>
    <select aria-label={label} value={tone} onChange={e => choose(e.target.value)}>
      {tones.map(option => <option key={option.id} value={option.id}>{option[locale]}</option>)}
    </select>
  </label>;
}
