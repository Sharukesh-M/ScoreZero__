import React from 'react';

export const GlowBackdrop: React.FC = () => {
  return (
    <>
      <style>{`
        .glow-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          overflow: hidden;
          z-index: 0;
          pointer-events: none;
        }

        .glow-blob {
          position: absolute;
          border-radius: 50%;
          will-change: transform, filter;
        }

        .glow-blob--a {
          width: 650px;
          height: 650px;
          background: radial-gradient(circle, #4285F4 0%, #A142F4 60%, transparent 100%);
          top: -20%;
          left: -10%;
          animation: blobMotionA 10s ease-in-out infinite alternate;
        }

        .glow-blob--b {
          width: 580px;
          height: 580px;
          background: radial-gradient(circle, #A142F4 0%, #EA4335 60%, transparent 100%);
          top: 25%;
          right: -10%;
          animation: blobMotionB 14s ease-in-out infinite alternate;
        }

        .glow-blob--c {
          width: 550px;
          height: 550px;
          background: radial-gradient(circle, #FBBC05 0%, #4285F4 60%, transparent 100%);
          bottom: -20%;
          left: 25%;
          animation: blobMotionC 12s ease-in-out infinite alternate;
        }

        @keyframes blobMotionA {
          0% {
            transform: translate(0px, 0px) scale(1) rotate(0deg);
            filter: blur(100px) hue-rotate(0deg) saturate(1.4);
            opacity: 0.6;
          }
          50% {
            transform: translate(140px, 90px) scale(1.3) rotate(120deg);
            filter: blur(130px) hue-rotate(120deg) saturate(1.8);
            opacity: 0.85;
          }
          100% {
            transform: translate(-90px, 150px) scale(0.9) rotate(240deg);
            filter: blur(110px) hue-rotate(240deg) saturate(1.5);
            opacity: 0.65;
          }
        }

        @keyframes blobMotionB {
          0% {
            transform: translate(0px, 0px) scale(1) rotate(0deg);
            filter: blur(110px) hue-rotate(90deg) saturate(1.5);
            opacity: 0.65;
          }
          50% {
            transform: translate(-150px, -100px) scale(1.25) rotate(180deg);
            filter: blur(140px) hue-rotate(210deg) saturate(1.9);
            opacity: 0.9;
          }
          100% {
            transform: translate(100px, -140px) scale(0.95) rotate(360deg);
            filter: blur(100px) hue-rotate(330deg) saturate(1.4);
            opacity: 0.6;
          }
        }

        @keyframes blobMotionC {
          0% {
            transform: translate(0px, 0px) scale(1) rotate(0deg);
            filter: blur(100px) hue-rotate(180deg) saturate(1.3);
            opacity: 0.6;
          }
          50% {
            transform: translate(120px, -120px) scale(1.35) rotate(140deg);
            filter: blur(125px) hue-rotate(300deg) saturate(1.7);
            opacity: 0.85;
          }
          100% {
            transform: translate(-110px, 80px) scale(0.9) rotate(280deg);
            filter: blur(105px) hue-rotate(420deg) saturate(1.4);
            opacity: 0.65;
          }
        }
      `}</style>
      <div className="glow-backdrop" aria-hidden="true">
        <div className="glow-blob glow-blob--a" />
        <div className="glow-blob glow-blob--b" />
        <div className="glow-blob glow-blob--c" />
      </div>
    </>
  );
};

export default GlowBackdrop;
