// Footer Component
const Footer = () => {
  return (
    <footer className="flex flex-wrap bg-[#06060d] justify-between items-center gap-4 border-t border-[#4b4133] px-10 py-6 text-[10px] font-bold tracking-wider text-[#a28e73]">
      <span>CODE_CHAMBER.V{__APP_VERSION__}</span>

      <div className="flex flex-wrap gap-4">
        <a href="/privacy" className="hover:text-white transition-colors">
          PRIVACY
        </a>
        <a href="/terms" className="hover:text-white transition-colors">
          TERMS
        </a>
        <a
          href="https://github.com/mayaralj/code-chamber"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-white transition-colors"
        >
          GITHUB
        </a>
      </div>

      <span>© {new Date().getFullYear()} CODE_CHAMBER</span>
    </footer>
  );
};

export default Footer;
