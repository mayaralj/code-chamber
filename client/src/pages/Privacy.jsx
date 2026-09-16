// Imports
import { useNavigate } from "react-router";

// GitHub repo used as the contact channel for this project (no dedicated support inbox)
const GITHUB_REPO_URL = "https://github.com/mayaralj/code-chamber";

// Reusable section wrapper matching the app's dark, mono-spaced aesthetic
const PolicySection = ({ title, children }) => (
  <section className="border border-[#2a251d] bg-[#111111] p-7 [background-image:radial-gradient(#5b4e3e_0.7px,transparent_0.7px)] [background-size:14.1px_14.1px]">
    <h2 className="text-lg font-black tracking-widest text-[#ffd99d]">
      {title}
    </h2>
    <div className="mt-3 space-y-3 text-[15px] leading-7 text-[#c7b499]">
      {children}
    </div>
  </section>
);

// Privacy component
const Privacy = () => {
  // Navigate
  const navigate = useNavigate();

  // Render
  return (
    <div className="min-h-screen overflow-x-hidden bg-[#0b0b0b] font-mono text-[#e7c49d]">
      <main className="w-full px-10 pb-20 pt-16">
        {/* Hero */}
        <section className="mx-auto max-w-3xl text-center">
          <button
            onClick={() => navigate("/")}
            className="mb-8 cursor-pointer text-xs font-bold tracking-widest text-[#8a7c63] transition-colors duration-200 hover:text-[#ffd99d]"
          >
            ← BACK TO HOME
          </button>
          <h1 className="text-5xl font-black tracking-tight text-[#ffedd1] md:text-6xl">
            PRIVACY_POLICY
          </h1>
          <p className="mt-4 text-[15px] leading-7 text-[#c7b499]">
            How Code Chamber collects, uses, and protects your information.
          </p>
        </section>

        {/* Policy sections */}
        <div className="mx-auto mt-14 flex max-w-3xl flex-col gap-6">
          <PolicySection title="INFORMATION_WE_COLLECT">
            <p>
              We collect the account information you provide directly, such as
              your username, password, and display name. If you sign in with
              Google, GitHub, or Discord, we receive basic profile information
              from that provider (your name) in order to create and link your
              account.
            </p>
            <p>
              We also store gameplay data tied to your account, including match
              history, code submissions, and related statistics.
            </p>
            <p>
              We do not collect or store your IP address, browser type, or
              general usage/analytics data.
            </p>
          </PolicySection>

          <PolicySection title="HOW_WE_USE_YOUR_INFORMATION">
            <p>
              We use the information we collect to maintain your account,
              display your stats and match history, keep you signed in between
              visits, and for leaderboards and game statistics. We do not sell
              or share your personal information with third parties for
              marketing purposes.
            </p>
          </PolicySection>

          <PolicySection title="DATA_SECURITY">
            <p>
              We take reasonable steps to protect your account information, but
              no method of storage or transmission over the internet is ever
              100% secure.
            </p>
          </PolicySection>

          <PolicySection title="CHANGES_TO_THIS_POLICY">
            <p>
              We may update this Privacy Policy from time to time. Any changes
              will be posted on this page, and we encourage you to review it
              periodically for any updates.
            </p>
          </PolicySection>

          <PolicySection title="CONTACT_US">
            <p>
              Code Chamber is an independently developed project without a
              dedicated support inbox. If you have questions or concerns about
              this Privacy Policy, please reach out via the project's GitHub
              repository:
            </p>
            <a
              href={GITHUB_REPO_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-block border border-[#cda979] bg-[#dfbb96] px-6 py-3 text-xs font-black tracking-widest text-[#211b14] transition-colors duration-200 hover:bg-[#efceaa]"
            >
              VIEW ON GITHUB ◫
            </a>
          </PolicySection>
        </div>

        {/* Footer note */}
        <p className="mx-auto mt-10 max-w-3xl text-center text-xs tracking-wide text-[#6d685f]">
          LAST UPDATED: SEPTEMBER 2026
        </p>
      </main>
    </div>
  );
};

export default Privacy;
