import React from "react";
import { Locale } from "@churchapps/apphelper";

export const LoginHeroPanel: React.FC = () => (
  <>
    <style>{`
      .hero-panel {
        flex: 1;
        background: linear-gradient(135deg, var(--c1d3) 0%, var(--c1) 40%, var(--c1l2) 100%);
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        padding: 48px;
        position: relative;
        overflow: hidden;
      }
      .hero-panel::before {
        content: '';
        position: absolute;
        top: -100px;
        right: -100px;
        width: 400px;
        height: 400px;
        border-radius: 50%;
        background: rgba(255,255,255,0.05);
      }
      .hero-panel::after {
        content: '';
        position: absolute;
        bottom: -80px;
        left: -80px;
        width: 300px;
        height: 300px;
        border-radius: 50%;
        background: rgba(255,255,255,0.04);
      }
      .hero-content {
        position: relative;
        z-index: 1;
        text-align: center;
        max-width: 420px;
      }
      .hero-logo {
        margin: 0 auto 32px;
      }
      .hero-logo img {
        max-width: 280px;
        height: auto;
      }
      .hero-title {
        font-size: 2.125rem;
        font-weight: 500;
        color: white;
        margin: 0 0 16px;
        line-height: 1.2;
      }
      .hero-subtitle {
        font-size: 1rem;
        color: rgba(255,255,255,0.8);
        line-height: 1.6;
        margin: 0 0 40px;
      }
      .hero-features {
        display: flex;
        flex-direction: column;
        gap: 16px;
        text-align: left;
      }
      .hero-feature {
        display: flex;
        align-items: center;
        gap: 12px;
        color: rgba(255,255,255,0.9);
        font-size: 0.875rem;
      }
      .hero-feature-icon {
        width: 32px;
        height: 32px;
        min-width: 32px;
        background: rgba(255,255,255,0.15);
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .hero-feature-icon svg {
        width: 16px;
        height: 16px;
        fill: white;
      }
      @media (max-width: 900px) {
        .hero-panel {
          display: none;
        }
      }
    `}</style>
    <div className="hero-panel">
      <div className="hero-content">
        <div className="hero-logo">
          <img src="/images/logo-white.png" alt="B1.church" />
        </div>
        <h1 className="hero-title">{Locale.label("components.loginHeroPanel.title")}</h1>
        <p className="hero-subtitle">
          {Locale.label("components.loginHeroPanel.subtitle")}
        </p>
        <div className="hero-features">
          <div className="hero-feature">
            <div className="hero-feature-icon">
              <svg viewBox="0 0 24 24"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>
            </div>
            <span>{Locale.label("components.loginHeroPanel.featurePeople")}</span>
          </div>
          <div className="hero-feature">
            <div className="hero-feature-icon">
              <svg viewBox="0 0 24 24"><path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM9 10H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2z"/></svg>
            </div>
            <span>{Locale.label("components.loginHeroPanel.featurePlanning")}</span>
          </div>
          <div className="hero-feature">
            <div className="hero-feature-icon">
              <svg viewBox="0 0 24 24"><path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"/></svg>
            </div>
            <span>{Locale.label("components.loginHeroPanel.featureDonations")}</span>
          </div>
          <div className="hero-feature">
            <div className="hero-feature-icon">
              <svg viewBox="0 0 24 24"><path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"/></svg>
            </div>
            <span>{Locale.label("components.loginHeroPanel.featureWebsite")}</span>
          </div>
        </div>
      </div>
    </div>
  </>
);
