import React from "react";
import ContractPage from "./ContractPage";
import ManifestPage from "./ManifestPage";
import InspectionPage from "./InspectionPage";

export default function ManifestDocument({ trip }) {
  return (
    <div>
      <ContractPage trip={trip} />
      <ManifestPage trip={trip} />
      <InspectionPage trip={trip} />
    </div>
  );
}