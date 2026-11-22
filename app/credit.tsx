import { GithubLogo } from "@phosphor-icons/react/ssr";

const REPO_URL = "https://github.com/rashad/ask-the-field";

export function SourceLink({ className, label = "Open source on GitHub" }: { className?: string; label?: string }) {
  return (
    <a className={className} href={REPO_URL} target="_blank" rel="noopener"><GithubLogo aria-hidden />{label}</a>
  );
}

export function Credit() {
  return (
    <span className="credit">Built by <a href="https://www.linkedin.com/in/rashadkaranouh/" target="_blank" rel="noopener">Rashad Karanouh</a></span>
  );
}
