import React from "react";

export default function PageFooter() {
  return (
    <div style={{
      position: "absolute", bottom: "6mm", left: "12mm", right: "12mm",
      fontSize: "7pt", textAlign: "center", color: "#333",
      borderTop: "1px solid #888", paddingTop: "4px"
    }}>
      <div>المملكة العربية السعودية - الجبيل - تلفون 013 3633115 - 013 + فاكس: 013 3622264 - ص.ب واصل 3107 - الجبيل 35513 - 9278</div>
      <div>Saudi Arabia - Jubail - Tel.: 013 363 3115 - Fax: 013 362 2264 - P.O. Box 3107 - Wasel - Jubail 35513 - 9278</div>
      <div>E-mail: info@msc.sa.com | www.msc.sa.com</div>
    </div>
  );
}