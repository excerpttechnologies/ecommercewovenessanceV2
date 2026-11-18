# Products removed from the storefront: no photo available

Generated: 2026-11-16. Source: RetailERP `barcodeLabel` (read-only), ERP e-commerce publishing scope.

## Why these products are hidden

A product card is only rendered when the product has a loadable photo: `getBarcodeImageCatalog()` drops
every listing row whose resolved image is empty, so shoppers never see a "Photo unavailable" card.
The resolver tries the record's own stored photo, then that barcode's public photo in Spaces
(`<barcode>.jpg`), then the legacy `/august_8A_images/<barcode>.jpg` path, and the ERP e-commerce product
photo as the last resort. The barcodes below have none of those, so they are removed from all storefront
listings: Sarees, Fabrics, Plain Fabrics, Dupatta, Inskirt, Border, Pavada, Dhotis, Ready Made, Ready Bits,
Unstitched Suits, New Arrivals, New and Best Buy.

Nothing was deleted from the ERP: stock, pricing and orders are untouched, and a product reappears
automatically as soon as a photo exists for its barcode.

## Summary

| Storefront category | Saleable products | Removed (no photo) |
| --- | ---: | ---: |
| Sarees | 742 | 77 |
| Fabrics | 413 | 193 |
| Plain Fabrics | 1 | 0 |
| Dupatta | 1 | 0 |
| Best Buy | 194 | 0 |
| New Arrivals | 272 | 0 |
| Ready Bits | 1 | 0 |
| **Total** | **1624** | **270** |

A barcode published in several categories is counted once, under the first category where it appears,
so the category rows add up to the total.

## Sarees (77)

| Barcode | Item code | Description | Status | Reason |
| --- | --- | --- | --- | --- |
| 4A2108 | 15-SA | FAUX, NY DYED , FANCY SAREE | IN_STOCK | No photo on the ERP record |
| 4A2526 | 15-SA | FANCY COTTON BLENDS, SAREE | IN_STOCK | No photo on the ERP record |
| 4A2665 | 15-SA | FANCY COTTON BLENDS, SAREE | IN_STOCK | No photo on the ERP record |
| 7A2511 | 15-SVNS | FAUX, FANCY DESIGNER SAREE | IN_STOCK | No photo on the ERP record |
| 7A2513 | 15-SVNS | FAUX, FANCY DESIGNER SAREE | IN_STOCK | No photo on the ERP record |
| 7A2514 | 15-SVNS | FAUX, FANCY DESIGNER SAREE | IN_STOCK | No photo on the ERP record |
| 8A1800 | 15-SA | FAUX, FANCY SAREE | IN_STOCK | No photo on the ERP record |
| 8A1803 | 15-SA | FAUX, FANCY SAREE | IN_STOCK | No photo on the ERP record |
| 8A3494 | 15-SVNS | VISCOSE , FANCY MADRAS CHECKS SAREE | IN_STOCK | No photo on the ERP record |
| 8A3495 | 15-SVNS | VISCOSE , FANCY MADRAS CHECKS SAREE | IN_STOCK | No photo on the ERP record |
| 8A3496 | 15-SVNS | VISCOSE , FANCY MADRAS CHECKS SAREE | IN_STOCK | No photo on the ERP record |
| 8A3996 | 15-S-KOL | FAUX, FANCY BENGAL SAREE | IN_STOCK | No photo on the ERP record |
| 8A4002 | 15-S-KOL | FAUX, FANCY BENGAL SAREE | IN_STOCK | No photo on the ERP record |
| 9A1118 | 15-S-KOL | FANCY SAREE | IN_STOCK | No photo on the ERP record |
| 9A1997 | 15-SRT | VISCOSE , DESIGNER WEAVE SAREE | IN_STOCK | No photo on the ERP record |
| 10A4201 | 15-SVNS | FAUX, MATKA SILKY FEEL, JAMDHANI WEAVE DESIGN PRINTED SAREE | IN_STOCK | No photo on the ERP record |
| 10A4228 | 15-SVNS | FAUX, MATKA SILKY FEEL, JAMDHANI WEAVE DESIGN PRINTED SAREE | IN_STOCK | No photo on the ERP record |
| 228739 | 15-S-KOL | faux ikkat feel silky saree | IN_STOCK | No photo on the ERP record |
| 231610 | 15-S-KOL | FAUX FANCY SAREE | IN_STOCK | No photo on the ERP record |
| 232343 | 15-SCTN | COTTON SAREE | IN_STOCK | No photo on the ERP record |
| 248793 | 15-SRT | FAUX, CHIFFON WITH CROCHET CONT BLOUSE SAREE | IN_STOCK | No photo on the ERP record |
| 256995 | 15-S-PLNSRT | FAUX, 6.3 MTR CUST , PLAIN ORGANZA FEEL SAREE | IN_STOCK | No photo on the ERP record |
| 256996 | 15-S-PLNSRT | FAUX, 6.3 MTR CUST , PLAIN ORGANZA FEEL SAREE | IN_STOCK | No photo on the ERP record |
| 257011 | 15-S-PLNSRT | FAUX, 6.3 MTR CUST , PLAIN ORGANZA FEEL SAREE | IN_STOCK | No photo on the ERP record |
| OJ16476 | 15-SRT | FAUX, SILKY FEEL SAREE | IN_STOCK | No photo on the ERP record |
| OJ16513 | 15-SRT | FAUX, FANCY SAREE | IN_STOCK | No photo on the ERP record |
| OJ16555 | 15-SRT | FAUX FANCY SAREE | IN_STOCK | No photo on the ERP record |
| OJ16592 | 15-SRT | FAUX FANCY SAREE | IN_STOCK | No photo on the ERP record |
| OJ16621 | 15-SRT | FAUX FANCY SAREE | IN_STOCK | No photo on the ERP record |
| OJ18163 | 15-SRT | FAUX, FANCY SAREE | IN_STOCK | No photo on the ERP record |
| OJ18164 | 15-SRT | FAUX, FANCY SAREE | IN_STOCK | No photo on the ERP record |
| OJ18165 | 15-SRT | FAUX, FANCY SAREE | IN_STOCK | No photo on the ERP record |
| OJ18670 | 15-SRT | FAUX FANCY SAREE | IN_STOCK | No photo on the ERP record |
| OK20553 | 15-S-PLNSRT | faux, plain saree cut 6.00 MTR cut | IN_STOCK | No photo on the ERP record |
| OK20753 | 15-SA | FAUX, FANCY SAREE | IN_STOCK | No photo on the ERP record |
| OK21409 | 15-S-PLNSRT | APX 6 MTR CUT, 0 TO 100 SHADED FABRIC | IN_STOCK | No photo on the ERP record |
| OT3909 | 15-SRT | FAUX, FANCY SAREE | IN_STOCK | No photo on the ERP record |
| OT4499 | 15-SRT | FAUX FANCY SAREE | IN_STOCK | No photo on the ERP record |
| OT4510 | 15-SRT | FAUX FANCY SAREE | IN_STOCK | No photo on the ERP record |
| OT4557 | 15-SRT | FAUX FANCY SAREE | IN_STOCK | No photo on the ERP record |
| OT4593 | 15-SRT | FAUX FANCY SAREE | IN_STOCK | No photo on the ERP record |
| OT5025 | 15-SRT | FAUX FANCY SAREE | IN_STOCK | No photo on the ERP record |
| OT5247 | 15-SRT | FAUX, FANCY SAREE | IN_STOCK | No photo on the ERP record |
| OT5248 | 15-SRT | FAUX, FANCY SAREE | IN_STOCK | No photo on the ERP record |
| OT5251 | 15-SRT | FAUX, FANCY SAREE | IN_STOCK | No photo on the ERP record |
| OT5253 | 15-SRT | FAUX, FANCY SAREE | IN_STOCK | No photo on the ERP record |
| OT5256 | 15-SRT | FAUX, FANCY SAREE | IN_STOCK | No photo on the ERP record |
| OT5258 | 15-SRT | FAUX, FANCY SAREE | IN_STOCK | No photo on the ERP record |
| OT5259 | 15-SRT | FAUX, FANCY SAREE | IN_STOCK | No photo on the ERP record |
| OT5260 | 15-SRT | FAUX, FANCY SAREE | IN_STOCK | No photo on the ERP record |
| OT5262 | 15-SRT | FAUX, FANCY SAREE | IN_STOCK | No photo on the ERP record |
| OT5263 | 15-SRT | FAUX, FANCY SAREE | IN_STOCK | No photo on the ERP record |
| OT7988 | 15-SRT | FAUX FANCY SAREE | IN_STOCK | No photo on the ERP record |
| OT8431 | 15-SRT | FAUX FANCY DESIGNER SAREE | IN_STOCK | No photo on the ERP record |
| OT8432 | 15-SRT | FAUX FANCY DESIGNER SAREE | IN_STOCK | No photo on the ERP record |
| OT8446 | 15-SRT | FAUX FANCY DESIGNER SAREE | IN_STOCK | No photo on the ERP record |
| OT8449 | 15-SRT | FAUX FANCY DESIGNER SAREE | IN_STOCK | No photo on the ERP record |
| OT8866 | 15-SRT | FAUX FANCY SAREE | IN_STOCK | No photo on the ERP record |
| OT9688 | 15-S-KOL | HANDLOOM COTTON SAREE | IN_STOCK | No photo on the ERP record |
| OT9710 | 15-S-KOL | HANDLOOM COTTON SAREE | IN_STOCK | No photo on the ERP record |
| OU8047 | 15-S GRDN | nara chiffon garden saree (without blouse) | IN_STOCK | No photo on the ERP record |
| OU8076 | 15-S GRDN | GARDEN SAREE WITHOUT BLOUSE | IN_STOCK | No photo on the ERP record |
| OU8083 | 15-S GRDN | GARDEN SAREE WITHOUT BLOUSE | IN_STOCK | No photo on the ERP record |
| OU11348 | 15-SA | FAUX FANCY TISSUE SAREE | IN_STOCK | No photo on the ERP record |
| OU12535 | 15-S-PLNSRT | FAUX, PLAIN SHIMMER FEEL SAREE | IN_STOCK | No photo on the ERP record |
| PA1875 | 15-S-KOL | FAUX FANCY SAREE | IN_STOCK | No photo on the ERP record |
| PA7566 | 15-SRT | FAUX FANCY SAREE | IN_STOCK | No photo on the ERP record |
| PA8819 | 15-S-KOL | FAUX FANCY SAREE | IN_STOCK | No photo on the ERP record |
| PA11034 | 15-SA | FAUX FANCY SAREE | IN_STOCK | No photo on the ERP record |
| PA11547 | 15-SRT | FAUX, FANCY SAREE | IN_STOCK | No photo on the ERP record |
| PA11566 | 15-SRT | FAUX, FANCY SAREE | IN_STOCK | No photo on the ERP record |
| PA11581 | 15-SRT | FAUX, FANCY SAREE | IN_STOCK | No photo on the ERP record |
| PA12684 | 15-SA | FAUX FANCY SAREE | IN_STOCK | No photo on the ERP record |
| PA12717 | 15-SA | FAUX FANCY SAREE | IN_STOCK | No photo on the ERP record |
| PA12791 | 15-SA | FAUX FANCY SAREE | IN_STOCK | No photo on the ERP record |
| PA13775 | 15-S-KOL | FAUX, FANCY SAREE | IN_STOCK | No photo on the ERP record |
| PA13777 | 15-S-KOL | FAUX, FANCY SAREE | IN_STOCK | No photo on the ERP record |

## Fabrics (193)

| Barcode | Item code | Description | Status | Reason |
| --- | --- | --- | --- | --- |
| 6A2703 | 4-F-HKOBA | faux, heavy soft rayan white hokoba fabric | IN_STOCK | No photo on the ERP record |
| 6A2704 | 4-F-HKOBA | faux, heavy soft rayan white hokoba fabric | IN_STOCK | No photo on the ERP record |
| 6A2708 | 4-F-HKOBA | faux, heavy soft rayan white hokoba fabric | IN_STOCK | No photo on the ERP record |
| 7A1704 | 4-F-TSUE | SILK TISSUE , BANARAS WEAVE FABRIC | IN_STOCK | No photo on the ERP record |
| 9A2265 | 4-F-W BDR | FAUX, FABRIC WITH EMB BORDER, PAITHANI DESIGN | IN_STOCK | No photo on the ERP record |
| 10A2001 | 4-F-W BDR | MASARAISED COTTON WITH BORDER WEAVE FABRIC | IN_STOCK | No photo on the ERP record |
| 10A2006 | 4-F-W BDR | MASARAISED COTTON WITH BORDER WEAVE FABRIC | IN_STOCK | No photo on the ERP record |
| 10A2010 | 4-F-W BDR | MASARAISED COTTON WITH BORDER WEAVE FABRIC | IN_STOCK | No photo on the ERP record |
| 158553 | 4-F-W BDR | MUNGA SILK WITH BRDR | IN_STOCK | No photo on the ERP record |
| 167189 | 4-F-W BDR | DIGI PRINT WITH BRDR | IN_STOCK | No photo on the ERP record |
| 169511 | 4-F-W BDR | PURE KORA DUPION SILK, WITH BRDR | IN_STOCK | No photo on the ERP record |
| 169514 | 4-F-W BDR | PURE KORA DUPION SILK, WITH BRDR | IN_STOCK | No photo on the ERP record |
| 170134 | 4-F-W BDR | fabric wihemb, brdr | IN_STOCK | No photo on the ERP record |
| 170138 | 4-F-W BDR | fabric wihemb, brdr | IN_STOCK | No photo on the ERP record |
| 170141 | 4-F-W BDR | fabric wihemb, brdr | IN_STOCK | No photo on the ERP record |
| 170307 | 4-F-TSUE | PURE TISSUE SILK WITH EMB | IN_STOCK | No photo on the ERP record |
| 171583 | 4-F-W BDR | DIGI PRINT WITH BRDR | IN_STOCK | No photo on the ERP record |
| 171585 | 4-F-W BDR | DIGI PRINT WITH BRDR | IN_STOCK | No photo on the ERP record |
| 171593 | 4-F-W BDR | DIGI PRINT WITH BRDR | IN_STOCK | No photo on the ERP record |
| 171619 | 4-F-W BDR | FABRIC WITH EMB, BORDER | IN_STOCK | No photo on the ERP record |
| 171632 | 4-F-TSUE | PURE TISSUE JAAL EMB | IN_STOCK | No photo on the ERP record |
| 177470 | 4-F-W BDR | FABRIC WITH BORDER | IN_STOCK | No photo on the ERP record |
| 177472 | 4-F-W BDR | FABRIC WITH BORDER | IN_STOCK | No photo on the ERP record |
| 177474 | 4-F-W BDR | FABRIC WITH BORDER | IN_STOCK | No photo on the ERP record |
| 177848 | 4-F-W BDR | FABRIC WITH BORDER | IN_STOCK | No photo on the ERP record |
| 179587 | 4-F-CTN | SEMI SILKY COTTON BATIK | IN_STOCK | No photo on the ERP record |
| 179589 | 4-F-CTN | SEMI SILKY COTTON BATIK | IN_STOCK | No photo on the ERP record |
| 179891 | 4-F-HKOBA | cotton hakoba fabric | IN_STOCK | No photo on the ERP record |
| 181967 | 4-F-TSUE | SILK HF TISSUE EMBOSE | IN_STOCK | No photo on the ERP record |
| 181968 | 4-F-TSUE | SILK HF TISSUE EMBOSE | IN_STOCK | No photo on the ERP record |
| 182185 | 4-F-W BDR | FAUX SOFTY FABRIC WITH BORDER | IN_STOCK | No photo on the ERP record |
| 184248 | 4-F-W BDR | FAUX TISSUE ZARI WASKAT ATNCHOI | IN_STOCK | No photo on the ERP record |
| 184250 | 4-F-W BDR | FAUX TISSUE ZARI WASKAT ATNCHOI | IN_STOCK | No photo on the ERP record |
| 184268 | 4-F-W BDR | FAUX TISSUE CONT, ZARI SKIRT JAAL BDR | IN_STOCK | No photo on the ERP record |
| 184271 | 4-F-W BDR | FAUX TISSUE CONT, ZARI SKIRT JAAL BDR | IN_STOCK | No photo on the ERP record |
| 184985 | 4-F-W BDR | FAUX TISSUE PAITHANI SKIRT BUTTI | IN_STOCK | No photo on the ERP record |
| 185563 | 4-F-W BDR | FAUX TISSUE ZARI SKRT WASKAT TANCHOI | IN_STOCK | No photo on the ERP record |
| 185565 | 4-F-W BDR | FAUX TISSUE ZARI SKRT WASKAT TANCHOI | IN_STOCK | No photo on the ERP record |
| 185566 | 4-F-W BDR | FAUX TISSUE ZARI SKRT WASKAT TANCHOI | IN_STOCK | No photo on the ERP record |
| 185574 | 4-F-W BDR | FAUX TISSUE CONT,ZARI SKIRT BOCADE | IN_STOCK | No photo on the ERP record |
| 185713 | 4-F-W BDR | SATIN PESTAL ZARI SKIRT ZARI BUTTI | IN_STOCK | No photo on the ERP record |
| 185751 | 4-F-W BDR | FAUX KANJI TISSUE ONE SIDE BRDR | IN_STOCK | No photo on the ERP record |
| 185756 | 4-F-W BDR | FAUX KANJI TISSUE ONE SIDE BRDR | IN_STOCK | No photo on the ERP record |
| 185770 | 4-F-W BDR | FAUX KANJI TISSUE TILFI PAITHANI | IN_STOCK | No photo on the ERP record |
| 186581 | 4-F-W BDR | FAUX TISSUE CONT, COPPER ZARI SKIRT BROCDE | IN_STOCK | No photo on the ERP record |
| 186588 | 4-F-W BDR | FAUX TISSUE ZARI SKIRT ZARI WASKAT TANCHOI | IN_STOCK | No photo on the ERP record |
| 187039 | 4-F-TSR | TUSSAR SILK, DYED WITH BUTTI | IN_STOCK | No photo on the ERP record |
| 188054 | 4-F-W BDR | CHINIYA SILK,BANDHEZ WITH BORDER | IN_STOCK | No photo on the ERP record |
| 188055 | 4-F-W BDR | CHINIYA SILK,BANDHEZ WITH BORDER | IN_STOCK | No photo on the ERP record |
| 190449 | 4-F-W BDR | KORA SILK, JKD BORDER, HVY EMB, DYABLE | IN_STOCK | No photo on the ERP record |
| 192545 | 4-F-HKOBA | COTTON WHITE HAKOBA FABRIC | IN_STOCK | No photo on the ERP record |
| 203733 | 4-F-W BDR | FAUX, ORGANZA DYED WITH BDR AND WORK | IN_STOCK | No photo on the ERP record |
| 203741 | 4-F-W BDR | FAUX, ORGANZA DYED WITH BDR AND WORK | IN_STOCK | No photo on the ERP record |
| 205562 | 4-F-W BDR | apx 4.70 MTR cut, pure silk with bdr weave | IN_STOCK | No photo on the ERP record |
| 234942 | 4-F-CTN | (36 INCH PANNA) DOBBY SELF JAQ FABRIC | IN_STOCK | No photo on the ERP record |
| 234955 | 4-F-W BDR | (36 INCH PANNA) SLUB WITH KHADDHI PRINTS | IN_STOCK | No photo on the ERP record |
| 234960 | 4-F-W BDR | (36 INCH PANNA) SLUB WITH KHADDHI PRINTS | IN_STOCK | No photo on the ERP record |
| 234963 | 4-F-W BDR | (36 INCH PANNA) SLUB WITH KHADDHI PRINTS | IN_STOCK | No photo on the ERP record |
| 234965 | 4-F-W BDR | (36 INCH PANNA) SLUB WITH KHADDHI PRINTS | IN_STOCK | No photo on the ERP record |
| 235870 | 4-F-W BDR | FX, SILVER DAMAN ORGANZA WITH BDR WEAVE | IN_STOCK | No photo on the ERP record |
| 235871 | 4-F-W BDR | FX, SILVER DAMAN ORGANZA WITH BDR WEAVE | IN_STOCK | No photo on the ERP record |
| 237611 | 4-F-W BDR | FX, ORGANZA WITH JARI COLOUR BRDR | IN_STOCK | No photo on the ERP record |
| 238079 | 4-F-TSR | (SM) TUSSAR SILK , PRINTED FABRIC | IN_STOCK | No photo on the ERP record |
| 238080 | 4-F-TSR | (SM) TUSSAR SILK , PRINTED FABRIC | IN_STOCK | No photo on the ERP record |
| 239568 | 4-F-TSUE | PURE RAW SILK TISSUE WITH BUTTA | IN_STOCK | No photo on the ERP record |
| 241414 | 4-F-TSR | (SM) PURE TUSSAR SILK DIGITAL PRINTED FABRIC | IN_STOCK | No photo on the ERP record |
| 241451 | 4-F-CTN | FAUX POLY COTTON FANCY FABRIC | IN_STOCK | No photo on the ERP record |
| 241452 | 4-F-CTN | FAUX POLY COTTON FANCY FABRIC | IN_STOCK | No photo on the ERP record |
| 241902 | 4-F-TSR | (SM) TUSSAR KALAMKARI FABRIC | IN_STOCK | No photo on the ERP record |
| 241904 | 4-F-TSR | (SM) TUSSAR KALAMKARI FABRIC | IN_STOCK | No photo on the ERP record |
| 241905 | 4-F-TSR | (SM) TUSSAR KALAMKARI FABRIC | IN_STOCK | No photo on the ERP record |
| 241906 | 4-F-TSR | (SM) TUSSAR KALAMKARI FABRIC | IN_STOCK | No photo on the ERP record |
| 241915 | 4-F-TSR | TISSUE SILVER WITH HEAVY EMB | IN_STOCK | No photo on the ERP record |
| 241916 | 4-F-TSR | TISSUE SILK WITH HEAVY EMB | IN_STOCK | No photo on the ERP record |
| 241918 | 4-F-TSR | TISSUE SILK WITH HEAVY EMB | IN_STOCK | No photo on the ERP record |
| 241919 | 4-F-TSR | TISSUE SILK WITH HEAVY EMB | IN_STOCK | No photo on the ERP record |
| 241920 | 4-F-TSR | TISSUE SILK WITH HEAVY EMB | IN_STOCK | No photo on the ERP record |
| 241922 | 4-F-TSR | TISSUE SILK WITH HEAVY EMB | IN_STOCK | No photo on the ERP record |
| 241924 | 4-F-TSR | TISSUE SILK WITH HEAVY EMB | IN_STOCK | No photo on the ERP record |
| 241926 | 4-F-TSR | TISSUE SILK WITH HEAVY EMB | IN_STOCK | No photo on the ERP record |
| 241927 | 4-F-TSR | TISSUE SILK WITH HEAVY EMB | IN_STOCK | No photo on the ERP record |
| 241928 | 4-F-TSR | TISSUE SILK WITH HEAVY EMB | IN_STOCK | No photo on the ERP record |
| 242115 | 4-F-W BDR | FAUX TISSUE FEEL WITH BORDER FABRIC | IN_STOCK | No photo on the ERP record |
| 243812 | 4-F-W BDR | FX,SILVER DAMAN ORGANZA WITH BDR WEAVE | IN_STOCK | No photo on the ERP record |
| 244692 | 4-F-TSUE | FAUX, TISSUE, EFFECT DYABLE JAQ | IN_STOCK | No photo on the ERP record |
| 244695 | 4-F-TSUE | FAUX, TISSUE, FX JARI JAQ FABRIC | IN_STOCK | No photo on the ERP record |
| 245124 | 4-F-W BDR | fancy fabric with border | IN_STOCK | No photo on the ERP record |
| 249066 | 4-F-W BDR | FAUX, SILKY FEEL WITH ZARI BORDER FABRIC | IN_STOCK | No photo on the ERP record |
| 249074 | 4-F-W BDR | FAUX, SILKY FEEL WITH ZARI BORDER FABRIC | IN_STOCK | No photo on the ERP record |
| 249079 | 4-F-W BDR | FAUX, SILKY FEEL WITH MEENA AND BORDER FABRIC | IN_STOCK | No photo on the ERP record |
| 249090 | 4-F-W BDR | faux, banarasi jaq with jari border | IN_STOCK | No photo on the ERP record |
| 249795 | 4-F-W BDR | FAUX, PATOLA IKKAT PRINT WITH ZARI BORDER FABRIC | IN_STOCK | No photo on the ERP record |
| 249798 | 4-F-W BDR | FAUX, PATOLA IKKAT PRINT WITH ZARI BORDER FABRIC | IN_STOCK | No photo on the ERP record |
| 249983 | 4-F-TSUE | FAUX, TISSUE, SILKY FEEL , DIGI PRINTED FABRIC | IN_STOCK | No photo on the ERP record |
| 250007 | 4-F-W BDR | FAUX, ORGANZA WITH BDR( DYABLE) | IN_STOCK | No photo on the ERP record |
| 250010 | 4-F-W BDR | FAUX, ORGANZA WITH BDR( DYABLE) | IN_STOCK | No photo on the ERP record |
| 250052 | 4-F-TSUE | TISSUE KOTA SILK, SILVER HVY EMB FABRIC | IN_STOCK | No photo on the ERP record |
| 250057 | 4-F-TSUE | TISSUE SILK WITH HVY EMB | IN_STOCK | No photo on the ERP record |
| 250485 | 4-F-W BDR | faux, gharchola design with paitheni weave fabric | IN_STOCK | No photo on the ERP record |
| 250488 | 4-F-W BDR | faux, gharchola design with paitheni weave fabric | IN_STOCK | No photo on the ERP record |
| 250707 | 4-F-W BDR | faux, silky feel with border fabric | IN_STOCK | No photo on the ERP record |
| 250711 | 4-F-W BDR | faux, silky feel with border fabric | IN_STOCK | No photo on the ERP record |
| 250715 | 4-F-W BDR | faux, silky feel with border fabric | IN_STOCK | No photo on the ERP record |
| 250956 | 4-F-W BDR | faux satin weave with border | IN_STOCK | No photo on the ERP record |
| 251138 | 4-F-TSUE | FAUX, TISSUE BANARASI WEAVE FABRIC | IN_STOCK | No photo on the ERP record |
| 251591 | 4-F-CTN | COTTON BASE MADHUBANI PRINT FABRIC | IN_STOCK | No photo on the ERP record |
| 254608 | 4-F-W BDR | FAUX, SILKY FEEL WITH ZARI BORDER FABRIC | IN_STOCK | No photo on the ERP record |
| 255681 | 4-F-CTN | FAUX, COTTON FEEL, ALFI PATOLA DYABLE | IN_STOCK | No photo on the ERP record |
| 256190 | 4-F-TSUE | PURE RAW SILK BY TISSUE TESTED ZARI , SPECIAL BUTTA FABRIC | IN_STOCK | No photo on the ERP record |
| 256191 | 4-F-TSUE | PURE RAW SILK BY TISSUE TESTED ZARI , SPECIAL BUTTA FABRIC | IN_STOCK | No photo on the ERP record |
| 256193 | 4-F-TSUE | TESTED ZARI BY ZARI , TISSUE WEAVE WITH BUTTA FABRIC | IN_STOCK | No photo on the ERP record |
| 256195 | 4-F-TSUE | TESTED ZARI BY ZARI , TISSUE WEAVE WITH BUTTA FABRIC | IN_STOCK | No photo on the ERP record |
| 256196 | 4-F-TSUE | TESTED ZARI BY ZARI, TISSUE WEAVE , WITH RICH SELF BUTTA, FABRIC | IN_STOCK | No photo on the ERP record |
| 256198 | 4-F-TSUE | TESTED ZARI BY ZARI , TISSUE WEAVE WITH BUTTA FABRIC | IN_STOCK | No photo on the ERP record |
| MB257717 | 4-F-CTN | PURE COTTON 60S*60S PRINTED RUNNING FABRIC | IN_STOCK | No photo on the ERP record |
| MB257723 | 4-F-CTN | PURE COTTON 60S*60S PRINTED RUNNING FABRIC | IN_STOCK | No photo on the ERP record |
| MB257726 | 4-F-CTN | PURE COTTON 60S*60S PRINTED RUNNING FABRIC | IN_STOCK | No photo on the ERP record |
| MB257730 | 4-F-CTN | PURE COTTON 60S*60S PRINTED RUNNING FABRIC | IN_STOCK | No photo on the ERP record |
| MB257733 | 4-F-CTN | PURE COTTON 60S*60S PRINTED RUNNING FABRIC | IN_STOCK | No photo on the ERP record |
| MB257735 | 4-F-CTN | PURE COTTON 60S*60S PRINTED RUNNING FABRIC | IN_STOCK | No photo on the ERP record |
| MB257745 | 4-F-CTN | PURE COTTON 60S*60S PRINTED RUNNING FABRIC | IN_STOCK | No photo on the ERP record |
| MB257750 | 4-F-CTN | PURE COTTON 60S*60S PRINTED RUNNING FABRIC | IN_STOCK | No photo on the ERP record |
| MB257752 | 4-F-CTN | PURE COTTON 60S*60S PRINTED RUNNING FABRIC | IN_STOCK | No photo on the ERP record |
| MB258322 | 4-F-W BDR | heavy satin , banarasi, handloom small butti with border weaving fabric | IN_STOCK | No photo on the ERP record |
| MB260109 | 4-F-W BDR | (SM)(TZ) PURE RAW SILK DUPION WITH , BORDER WEAVE , FABRIC | IN_STOCK | No photo on the ERP record |
| MB260267 | 4-F-TSUE | PURE SILK TISSUE KOTA, WITH DESIGNER JAAL ALLOVER FABRIC | IN_STOCK | No photo on the ERP record |
| MB260823 | 4-F-TSUE | PURE TISSUE SILK WITH JAAL WORK EMBRODERY FABRIC | IN_STOCK | No photo on the ERP record |
| MB261472 | 4-F-W BDR | FAUX, TISSUE SILKY FEEL WITH BUTTA AND BORDER FABRIC | IN_STOCK | No photo on the ERP record |
| MB261473 | 4-F-W BDR | FAUX, TISSUE SILKY FEEL WITH BUTTA AND BORDER FABRIC | IN_STOCK | No photo on the ERP record |
| MB261474 | 4-F-W BDR | FAUX, TISSUE SILKY FEEL WITH BUTTA AND BORDER FABRIC | IN_STOCK | No photo on the ERP record |
| MB261475 | 4-F-W BDR | FAUX, TISSUE SILKY FEEL WITH BUTTA AND BORDER FABRIC | IN_STOCK | No photo on the ERP record |
| OD1081 | 4-F-W BDR | (SM) RAW SILK, WITH HEAVY CROSS STITCH WORK FABRIC | IN_STOCK | No photo on the ERP record |
| OD1336 | 4-F-W BDR | FAUX, PAITHANI WITH BROCADE TILFI WEAVE, FABRIC | IN_STOCK | No photo on the ERP record |
| OD1337 | 4-F-W BDR | FAUX, PAITHANI WITH BROCADE TILFI WEAVE, FABRIC | IN_STOCK | No photo on the ERP record |
| OD1391 | 4-F-W BDR | FAUX, BANARASI DESIGN, KATHAN JAAL WITH EQUAL BORDER FABRIC | IN_STOCK | No photo on the ERP record |
| OD1395 | 4-F-W BDR | FAUX, BANARASI DESIGN, KATHAN JAAL WITH EQUAL BORDER FABRIC | IN_STOCK | No photo on the ERP record |
| OD1575 | 4-F-TSUE | FAUX, GOLDY TISSUE FEEL WITH BUTTA WEAVE FABRIC | IN_STOCK | No photo on the ERP record |
| OD1578 | 4-F-TSUE | FAUX, GOLDY TISSUE FEEL WITH BUTTA WEAVE FABRIC | IN_STOCK | No photo on the ERP record |
| OD1580 | 4-F-TSUE | FAUX, GOLDY TISSUE FEEL WITH BUTTA WEAVE FABRIC | IN_STOCK | No photo on the ERP record |
| OD1584 | 4-F-TSUE | FAUX, GOLDY TISSUE FEEL WITH BUTTA WEAVE FABRIC | IN_STOCK | No photo on the ERP record |
| OD1775 | 4-F-TSUE | TISSUE ZARI BOOTI , BANARASI WEAVE | IN_STOCK | No photo on the ERP record |
| OD3120 | 4-F-W BDR | 48" PANNA, SPECIAL PROCESSED BLOCKED PRINTED WITH CUTWORK SELF DYED BORDER FABRIC | IN_STOCK | No photo on the ERP record |
| OD3434 | 4-F-W BDR | cotton block print with fancy border | IN_STOCK | No photo on the ERP record |
| OD3436 | 4-F-W BDR | cotton block print with fancy border | IN_STOCK | No photo on the ERP record |
| OG11669 | 4-F-W BDR | FAUX, FUSION PATOLA PRINT WITH ART ZARI FABRIC | IN_STOCK | No photo on the ERP record |
| OG11674 | 4-F-W BDR | FAUX, FUSION PATOLA PRINT WITH ART ZARI FABRIC | IN_STOCK | No photo on the ERP record |
| OG11679 | 4-F-W BDR | FAUX, FUSION PATOLA PRINT WITH ART ZARI FABRIC | IN_STOCK | No photo on the ERP record |
| OG11684 | 4-F-W BDR | FAUX, FUSION PATOLA PRINT WITH ART ZARI FABRIC | IN_STOCK | No photo on the ERP record |
| OG11688 | 4-F-W BDR | FAUX, FUSION PATOLA PRINT WITH ART ZARI FABRIC | IN_STOCK | No photo on the ERP record |
| OG11699 | 4-F-W BDR | FAUX, FUSION PATOLA PRINT WITH ART ZARI FABRIC | IN_STOCK | No photo on the ERP record |
| OG11808 | 4-F-W BDR | heavy satin , banarasi, handloom small butti with border weaving fabric | IN_STOCK | No photo on the ERP record |
| OH13681 | 4-F-W BDR | FAUX, SILKY WITH ZARI BORDER FABRIC | IN_STOCK | No photo on the ERP record |
| OH15147 | 4-F-CTN | special designer soft cotton , heavy emb fabric | IN_STOCK | No photo on the ERP record |
| OH15148 | 4-F-CTN | special designer soft cotton , heavy emb fabric | IN_STOCK | No photo on the ERP record |
| OJ16359 | 4-F-CTN | SOFT COTTON PRINTED FABRIC | IN_STOCK | No photo on the ERP record |
| OJ16360 | 4-F-CTN | SOFT COTTON PRINTED FABRIC | IN_STOCK | No photo on the ERP record |
| OJ16362 | 4-F-CTN | SOFT COTTON PRINTED FABRIC | IN_STOCK | No photo on the ERP record |
| OJ16363 | 4-F-CTN | SOFT COTTON PRINTED FABRIC | IN_STOCK | No photo on the ERP record |
| OJ16368 | 4-F-CTN | SOFT COTTON PRINTED FABRIC | IN_STOCK | No photo on the ERP record |
| OJ16375 | 4-F-CTN | SOFT COTTON PRINTED FABRIC | IN_STOCK | No photo on the ERP record |
| OJ16377 | 4-F-CTN | SOFT COTTON PRINTED FABRIC | IN_STOCK | No photo on the ERP record |
| OJ16378 | 4-F-CTN | SOFT COTTON PRINTED FABRIC | IN_STOCK | No photo on the ERP record |
| OJ16382 | 4-F-CTN | SOFT COTTON PRINTED FABRIC | IN_STOCK | No photo on the ERP record |
| OJ16383 | 4-F-CTN | SOFT COTTON PRINTED FABRIC | IN_STOCK | No photo on the ERP record |
| OJ16390 | 4-F-CTN | SOFT COTTON PRINTED FABRIC | IN_STOCK | No photo on the ERP record |
| OJ16393 | 4-F-CTN | SOFT COTTON PRINTED FABRIC | IN_STOCK | No photo on the ERP record |
| OJ16396 | 4-F-CTN | SOFT COTTON PRINTED FABRIC | IN_STOCK | No photo on the ERP record |
| OJ16397 | 4-F-CTN | SOFT COTTON PRINTED FABRIC | IN_STOCK | No photo on the ERP record |
| OJ16401 | 4-F-CTN | SOFT COTTON PRINTED FABRIC | IN_STOCK | No photo on the ERP record |
| OJ19479 | 4-F-CTN | FANCY COTTON FABRIC | IN_STOCK | No photo on the ERP record |
| OJ19481 | 4-F-CTN | FANCY COTTON FABRIC | IN_STOCK | No photo on the ERP record |
| OJ19484 | 4-F-CTN | FANCY COTTON FABRIC | IN_STOCK | No photo on the ERP record |
| OJ19486 | 4-F-CTN | FANCY COTTON FABRIC | IN_STOCK | No photo on the ERP record |
| OJ20232 | 4-F-CTN | SOFT COTTN FEEL, WITH NICE EMB FABRIC | IN_STOCK | No photo on the ERP record |
| OJ20238 | 4-F-CTN | SOFT COTTN FEEL, WITH NICE EMB FABRIC | IN_STOCK | No photo on the ERP record |
| OK21358 | 4-F-CTN | FAUX FANCY FABRIC | IN_STOCK | No photo on the ERP record |
| OK21359 | 4-F-CTN | FAUX FANCY FABRIC | IN_STOCK | No photo on the ERP record |
| OK21360 | 4-F-CTN | FAUX FANCY FABRIC | IN_STOCK | No photo on the ERP record |
| OK22261 | 4-F-W BDR | VISCOSE BASE WITH PICHWAI STYLE BORDER DDESIGN FABRIC | IN_STOCK | No photo on the ERP record |
| OL1375 | 4-F-CTN | COTTON KALAMKARI DESIGN FABRIC | IN_STOCK | No photo on the ERP record |
| OL1377 | 4-F-CTN | COTTON KALAMKARI DESIGN FABRIC | IN_STOCK | No photo on the ERP record |
| OL1378 | 4-F-CTN | COTTON KALAMKARI DESIGN FABRIC | IN_STOCK | No photo on the ERP record |
| OL1379 | 4-F-CTN | COTTON KALAMKARI DESIGN FABRIC | IN_STOCK | No photo on the ERP record |
| OL1380 | 4-F-CTN | COTTON KALAMKARI DESIGN FABRIC | IN_STOCK | No photo on the ERP record |
| OL1381 | 4-F-CTN | COTTON KALAMKARI DESIGN FABRIC | IN_STOCK | No photo on the ERP record |
| OL1382 | 4-F-CTN | COTTON KALAMKARI DESIGN FABRIC | IN_STOCK | No photo on the ERP record |
| OL1384 | 4-F-CTN | COTTON KALAMKARI DESIGN FABRIC | IN_STOCK | No photo on the ERP record |
| OL2205 | 4-F-W BDR | FAUX, WITH BORDER EMB FABRIC | IN_STOCK | No photo on the ERP record |
| OM3938 | 4-F-W BDR | (SM) (TZ) PURE SILK MUNGA WITH CROSS STITCH DESIGNER EMB FABRIC | IN_STOCK | No photo on the ERP record |
| OP2757 | 4-F-W BDR | TISSUE FEEL, SILKY KADIYAL MEENA WITH BORDER FABRIC | IN_STOCK | No photo on the ERP record |
| OQ7316 | 4-F-W BDR | FAUX, VISCOSE TISSUE WITH BORDER FABRIC | IN_STOCK | No photo on the ERP record |
| OQ10912 | 4-F-W BDR | FAUX, KERLA TISSUE FABRIC WITH BORDER | IN_STOCK | No photo on the ERP record |
| OT5558 | 4-F-W BDR | faux, dupion silky feel with emb and border fabric | IN_STOCK | No photo on the ERP record |

## To restore a product

Upload that barcode's photo in the ERP (it is published as `<barcode>.jpg` in the Spaces bucket) or to the
ERP `/august_8A_images/` folder, then reload the collection. No code change and no redeploy is needed.
