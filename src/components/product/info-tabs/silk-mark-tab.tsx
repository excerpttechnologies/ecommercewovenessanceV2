import { BadgeCheck, ShieldCheck } from "lucide-react";
import { isSilkMaterial } from "@/lib/product-info";

/**
 * Silk Mark information. Certification is only presented as verified when the
 * product record carries an explicit certified flag; nothing is inferred from
 * the fabric name alone.
 */
export function SilkMarkTab({
  material,
  productName,
  certified,
  certificationNumber,
}: {
  material?: string | null;
  productName: string;
  certified: boolean;
  certificationNumber?: string;
}) {
  const silk = isSilkMaterial(material, productName);

  return (
    <div className="space-y-5">
      <div>
        <h3 className="font-display text-xl font-semibold text-olive">About Silk Mark</h3>
        <p className="mt-2 max-w-3xl text-ink/80">
          Silk Mark is the certification issued by the Silk Mark Organisation of India for pure, natural silk. A
          certified piece carries a hologram label with a unique licence number that can be checked with the
          organisation. Certified silk has been tested for silk content, so it is a reliable sign of genuine silk
          rather than a blend or synthetic substitute.
        </p>
      </div>

      <div className="max-w-3xl rounded-lg border border-line bg-ivory px-4 py-4">
        {certified ? (
          <div className="flex gap-3">
            <BadgeCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" aria-hidden />
            <div>
              <p className="font-semibold text-olive">Silk Mark certified</p>
              <p className="mt-1 text-ink/80">
                This piece is recorded as Silk Mark certified{certificationNumber ? ` under licence ${certificationNumber}` : ""}.
                The hologram label is attached to the product and is also shown with the parcel.
              </p>
            </div>
          </div>
        ) : silk ? (
          <div className="flex gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-muted" aria-hidden />
            <div>
              <p className="font-semibold text-olive">Certification not recorded for this piece</p>
              <p className="mt-1 text-ink/80">
                This is a silk product, but we have not recorded a Silk Mark certification for it, so we do not
                present it as certified. If you would like the certification status confirmed before ordering,
                share the item code with our customer care team and we will check the physical label.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-muted" aria-hidden />
            <div>
              <p className="font-semibold text-olive">Silk Mark does not apply to this product</p>
              <p className="mt-1 text-ink/80">
                Silk Mark certification is issued only for pure silk. This product is made of
                {material ? ` ${material}` : " a non-silk fabric"}, so no Silk Mark certification applies to it.
              </p>
            </div>
          </div>
        )}
      </div>

      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-olive">How to identify certified silk</p>
        <ul className="mt-2 grid gap-2 sm:grid-cols-2">
          <li>The hologram Silk Mark label is stitched or attached to the product, with the licence number printed on it.</li>
          <li>The licence number can be verified with the Silk Mark Organisation of India before you buy.</li>
          <li>Certified pieces are sold with the label intact and an invoice that matches the item code.</li>
          <li>Plain, blended or synthetic fabrics are not Silk Mark certified, however similar they look.</li>
        </ul>
      </div>
    </div>
  );
}
