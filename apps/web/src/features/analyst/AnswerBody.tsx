import { memo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import styles from "./AnswerBody.module.css";

/**
 * Renders an analyst answer as markdown. The service prompt asks the model to bold
 * EUR amounts and country codes, so rendering these as plain text would surface raw
 * `**` to the seller. Memoised because it re-renders on every streamed token.
 */
export const AnswerBody = memo(function AnswerBody({ text }: { text: string }) {
  return (
    <div className={styles.body}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Anchors come from model output, so keep them non-referring and sandboxed.
          a: ({ node: _node, ...props }) => (
            <a {...props} target="_blank" rel="noopener noreferrer nofollow" />
          ),
          table: ({ node: _node, ...props }) => (
            <div className={styles.tableWrap}>
              <table {...props} />
            </div>
          ),
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
});
