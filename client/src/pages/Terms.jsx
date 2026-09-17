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

// Terms component
const Terms = () => {
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
            TERMS_OF_SERVICE
          </h1>
          <p className="mt-4 text-[15px] leading-7 text-[#c7b499]">
            The rules for using Code Chamber.
          </p>
        </section>

        {/* Terms sections */}
        <div className="mx-auto mt-14 flex max-w-3xl flex-col gap-6">
          <PolicySection title="ACCEPTANCE_OF_TERMS">
            <p>
              By creating an account or using Code Chamber, you agree to these
              Terms of Service. If you don't agree with them, please don't use
              the app.
            </p>
          </PolicySection>

          <PolicySection title="ACCOUNTS">
            <p>
              You're responsible for the security of your account and anything
              that happens under it. There's no minimum age restriction stated
              for using Code Chamber.
            </p>
          </PolicySection>

          <PolicySection title="PROHIBITED_CONDUCT">
            <p>You may not, while using Code Chamber:</p>
            <ul className="list-inside list-disc space-y-1">
              <li>Harass, threaten, or abuse other players</li>
              <li>Use offensive or inappropriate usernames</li>
              <li>Use bots, scripts, or other automation to play matches</li>
              <li>Exploit bugs or abuse the platform in bad faith</li>
            </ul>
          </PolicySection>

          <PolicySection title="CONTENT_OWNERSHIP">
            <p>
              You keep ownership of the code you submit during matches. We store
              it to run gameplay and display your stats, but we don't claim it
              as ours. "Code Chamber," its branding, and the platform itself
              belong to this project.
            </p>
          </PolicySection>

          <PolicySection title="SERVICE_AVAILABILITY">
            <p>
              Code Chamber is provided as-is, with no guarantee of uptime,
              availability, or that it will be free of bugs. It's an
              independently developed project, not a commercial product with a
              service-level agreement.
            </p>
          </PolicySection>

          <PolicySection title="TERMINATION">
            <p>
              We can suspend, ban, or delete accounts that violate these Terms.
              You can delete your own account at any time from your profile,
              which removes your profile, linked accounts, and match history.
            </p>
          </PolicySection>

          <PolicySection title="CHANGES_TO_THESE_TERMS">
            <p>
              We may update these Terms from time to time. Any changes will be
              posted on this page, and we encourage you to review it
              periodically for any updates.
            </p>
          </PolicySection>

          <PolicySection title="CONTACT_US">
            <p>
              Code Chamber is an independently developed project without a
              dedicated support inbox. If you have questions about these Terms,
              please reach out via the project's GitHub repository:
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

export default Terms;
