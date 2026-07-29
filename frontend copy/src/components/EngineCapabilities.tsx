import { motion } from "framer-motion";
import FlowingMenu from "./FlowingMenu";

const skillCategories = [
  {
    link: "#",
    text: "ScoreZero Statement Parser",
    items: [
      { name: "Neural PDF Ingestion" },
      { name: "Metric Score Model (0-100)" },
      { name: "Statement Anomaly Classifier" },
      { name: "NSF & Fraud Detector" },
      { name: "Cashflow Volatility Index" },
      { name: "AI Underwriting Suggestion" }
    ]
  },
  {
    link: "#",
    text: "ScoreZero Analytics",
    items: [
      { name: "Multi-Bank Statement OCR" },
      { name: "Line-Item Ledger Tagging" },
      { name: "Real-Time Risk Metrics" },
      { name: "Underwriting PDF Reports" },
      { name: "Decisioning Dashboard" },
      { name: "Instant Rate Optimizer" }
    ]
  },
  {
    link: "#",
    text: "ScoreZero Underwriting Vault",
    items: [
      { name: "AES-256 Data Encryption" },
      { name: "SOC2 Type II Compliant" },
      { name: "Read-Only Statement Vault" },
      { name: "Enterprise LOS Webhooks" },
      { name: "OAuth 2.0 API Gateway" },
      { name: "Zero-Knowledge Privacy" }
    ]
  }
];

const EngineCapabilities = () => {
  return (
    <section className="min-h-screen bg-white text-black font-sans flex flex-col justify-center">
      <div className="w-full px-6 md:px-12 lg:px-16 pt-24 pb-12 md:pt-12 md:pb-12 bg-white z-10 md:flex-shrink-0">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="grid grid-cols-1 md:grid-cols-5 gap-y-8"
        >
          <div className="md:col-span-1">
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500">Tech & Principles</h2>
          </div>
          <div className="md:col-span-4">
            <blockquote className="text-3xl md:text-5xl lg:text-6xl xl:text-7xl font-black uppercase leading-tight text-slate-900">
              "ScoreZero parses uploaded PDF bank statements, calculates precise 0-100 metric scores, and delivers instant AI suggestions."
            </blockquote>
            <p className="mt-6 text-slate-600 font-bold uppercase tracking-wider">— ScoreZero Core Architecture</p>
          </div>
        </motion.div>
      </div>

      <div className="w-full border-t border-black relative overflow-hidden">
        <FlowingMenu
          items={skillCategories}
          speed={3}
          marqueeBgColor="#000000"
        />
      </div>
    </section>
  );
};

export default EngineCapabilities;
