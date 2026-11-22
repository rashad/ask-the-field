import { GithubLogo } from "@phosphor-icons/react/ssr";

export const REPO_URL = "https://github.com/rashad/ask-the-field";

export function SourceLink({ className }: { className?: string }) {
  return (
    <a className={className} href={REPO_URL} target="_blank" rel="noopener"><GithubLogo aria-hidden />Open source on GitHub</a>
  );
}

export function Credit() {
  return (
    <span className="credit caption-4">
      <span>Concept prototype by <a href="https://www.linkedin.com/in/rashadkaranouh/" target="_blank" rel="noopener">Rashad Karanouh</a></span>
      <SourceLink className="srclink" />
    </span>
  );
}
