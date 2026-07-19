import React from "react";

export default function CompanyStamp({ size = 110 }) {
  const blue = "#1a5c8a";

  // 5-pointed star at center-left
  const starPoints = (() => {
    const pts = [];
    const sCx = 62, sCy = 100;
    const outerR = 14, innerR = 5.5;
    for (let i = 0; i < 10; i++) {
      const angle = (-90 + i * 36) * Math.PI / 180;
      const r = i % 2 === 0 ? outerR : innerR;
      pts.push(`${(sCx + r * Math.cos(angle)).toFixed(1)},${(sCy + r * Math.sin(angle)).toFixed(1)}`);
    }
    return pts.join(" ");
  })();

  return (
    <svg viewBox="0 0 200 200" width={size} height={size} xmlns="http://www.w3.org/2000/svg" style={{ display: "block" }}>
      <defs>
        <path id="stampTopArc" d="M 25 100 A 75 75 0 0 1 175 100" fill="none" />
        <path id="stampBottomArc" d="M 175 100 A 75 75 0 0 1 25 100" fill="none" />
      </defs>
      <circle cx="100" cy="100" r="92" fill="none" stroke={blue} strokeWidth="2.5" />
      <circle cx="100" cy="100" r="85" fill="none" stroke={blue} strokeWidth="1" />
      <polygon points={starPoints} fill={blue} />
      <text x="120" y="92" textAnchor="middle" fontSize="11" fill={blue} fontWeight="700" fontFamily="'Cairo', Arial, sans-serif">س.ت</text>
      <text x="120" y="106" textAnchor="middle" fontSize="11" fill={blue} fontWeight="700" fontFamily="Arial, sans-serif">2055010235</text>
      <text x="120" y="120" textAnchor="middle" fontSize="11" fill={blue} fontWeight="700" fontFamily="'Cairo', Arial, sans-serif">الجبيل</text>
      <text fontSize="10.5" fill={blue} fontWeight="700" fontFamily="'Cairo', Arial, sans-serif">
        <textPath href="#stampTopArc" startOffset="50%" textAnchor="middle">
          شركة مرجان الشرقية للمقاولات العامة
        </textPath>
      </text>
      <text fontSize="10.5" fill={blue} fontWeight="700" fontFamily="'Cairo', Arial, sans-serif">
        <textPath href="#stampBottomArc" startOffset="50%" textAnchor="middle">
          المملكة العربية السعودية
        </textPath>
      </text>
    </svg>
  );
}