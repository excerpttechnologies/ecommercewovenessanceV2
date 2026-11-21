// export function SaleAssistWidget() {
//   const sourceKey =
//     process.env.NEXT_PUBLIC_SALEASSIST_SOURCE_KEY ||
//     '24d6b6bb-c2ed-494b-8714-317738d90d17';

//   const handleScriptLoad = () => {
//     if (!window.EmbeddableWidget) {
//       console.error("[saleassist] Widget API is unavailable after the script loaded");
//       return;
//     }

//     window.EmbeddableWidget.mount({ source_key: sourceKey });

//     const positionStyleId = 'saleassist-widget-position';
//     let positionStyle = document.getElementById(positionStyleId) as HTMLStyleElement | null;
//     if (!positionStyle) {
//       positionStyle = document.createElement('style');
//       positionStyle.id = positionStyleId;
//       document.head.appendChild(positionStyle);
//     }
//     positionStyle.textContent = `
//       :root {
//         --saLiveWidgetBtnPosition: 50% 16px auto auto;
//         --saLiveWidgetTransformOrigin: 100% 50%;
//       }

//       .sa-live-call-widget-btn-container,
//       .saleassist .sa-live-call-widget-btn-container,
//       .sa-live-call-widget-expanded:not(.sa-live-call-widget-expanded-maximize),
//       .saleassist .sa-live-call-widget-expanded:not(.sa-live-call-widget-expanded-maximize),
//       .sa-live-call-widget-expanded-minimize-tile,
//       .saleassist .sa-live-call-widget-expanded-minimize-tile {
//         top: 50% !important;
//         right: 16px !important;
//         bottom: auto !important;
//         left: auto !important;
//         translate: 0 -50% !important;
//       }

//       .sa-live-call-widget-expanded:not(.sa-live-call-widget-expanded-maximize),
//       .saleassist .sa-live-call-widget-expanded:not(.sa-live-call-widget-expanded-maximize) {
//         transform-origin: 100% 50% !important;
//       }

//       .sa-live-call-widget-btn-container-type-video_icon .sa-live-call-widget-close-btn,
//       .sa-live-call-widget-btn-container-type-video_message .sa-live-call-widget-close-btn,
//       .sa-live-call-widget-btn-container-type-shoppable_video .sa-live-call-widget-close-btn,
//       .sa-live-call-widget-btn-container-type-video_icon:hover .sa-live-call-widget-close-btn,
//       .sa-live-call-widget-btn-container-type-video_message:hover .sa-live-call-widget-close-btn,
//       .sa-live-call-widget-btn-container-type-shoppable_video:hover .sa-live-call-widget-close-btn {
//         display: none !important;
//         visibility: hidden !important;
//         pointer-events: none !important;
//       }

//       .sa-live-call-widget-close-trigger-message-btn,
//       .saleassist .sa-live-call-widget-close-trigger-message-btn {
//         display: none !important;
//         visibility: hidden !important;
//         pointer-events: none !important;
//       }

//       @media (max-width: 600px) {
//         .sa-live-call-widget-expanded:not(.sa-live-call-widget-expanded-maximize):not(.sa-live-call-widget-expanded-minimize-tile):not(.fromVideoPopup),
//         .saleassist .sa-live-call-widget-expanded:not(.sa-live-call-widget-expanded-maximize):not(.sa-live-call-widget-expanded-minimize-tile):not(.fromVideoPopup) {
//           width: min(324px, calc(100vw - 32px)) !important;
//           height: min(576px, calc(100vh - 32px)) !important;
//           height: min(576px, calc(100dvh - 32px)) !important;
//           max-height: calc(100vh - 32px) !important;
//           max-height: calc(100dvh - 32px) !important;
//           margin: 0 !important;
//           border-radius: 16px !important;
//         }
//       }
//     `;
//   };

//   return (
//     <Script
//       id="saleassist-widget-script"
//       // Replace with the exact <script src="..."> URL from your SaleAssist Integration tab
//       src="https://static.saleassist.ai/widgets/widget.js"
//       strategy="lazyOnload"
//       onLoad={handleScriptLoad}
//       onError={(error) => console.error("[saleassist] Widget script failed to load", error)}
//     />
//   );
// }