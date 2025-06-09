import { cn } from "@/lib/utils"
import { marked } from "marked"
import { memo, useId, useMemo } from "react"
import ReactMarkdown, { Components } from "react-markdown"
import remarkBreaks from "remark-breaks"
import remarkGfm from "remark-gfm"
import { CodeBlock, CodeBlockCode } from "./code-block"

export type MarkdownProps = {
  children: string
  id?: string
  className?: string
  components?: Partial<Components>
}

// Regular function - doesn't need to be a hook since it has no dependencies
function parseMarkdownIntoBlocks(markdown: string): string[] {
  const tokens = marked.lexer(markdown)
  return tokens.map((token) => token.raw)
}

// Regular function - doesn't need to be a hook since it has no dependencies
function extractLanguage(className?: string): string {
  if (!className) return "plaintext"
  const match = className.match(/language-(\w+)/)
  return match ? match[1] : "plaintext"
}

// Memoize the code component to prevent unnecessary re-renders
const CodeComponent = memo(({ className, children, ...props }: any) => {
  const isInline =
    !props.node?.position?.start.line ||
    props.node?.position?.start.line === props.node?.position?.end.line

  const language = useMemo(() => extractLanguage(className), [className])

  if (isInline) {
    return (
      <span
        className={cn(
          "bg-primary-foreground rounded-sm px-1 font-mono text-sm",
          className
        )}
        {...props}
      >
        {children}
      </span>
    )
  }

  return (
    <CodeBlock className={className}>
      <CodeBlockCode code={children as string} language={language} />
    </CodeBlock>
  )
})

CodeComponent.displayName = "CodeComponent"

// Memoize the pre component
const PreComponent = memo(({ children }: any) => {
  return <>{children}</>
})

PreComponent.displayName = "PreComponent"

// Create memoized components object
const INITIAL_COMPONENTS: Partial<Components> = {
  code: CodeComponent,
  pre: PreComponent,
}

const MemoizedMarkdownBlock = memo(
  function MarkdownBlock({
    content,
    components = INITIAL_COMPONENTS,
  }: {
    content: string
    components?: Partial<Components>
  }) {
    // Memoize the remark plugins array to prevent re-creation
    const remarkPlugins = useMemo(() => [remarkGfm, remarkBreaks], [])

    return (
      <ReactMarkdown
        remarkPlugins={remarkPlugins}
        components={components}
      >
        {content}
      </ReactMarkdown>
    )
  },
  function propsAreEqual(prevProps, nextProps) {
    return (
      prevProps.content === nextProps.content &&
      prevProps.components === nextProps.components
    )
  }
)

MemoizedMarkdownBlock.displayName = "MemoizedMarkdownBlock"

function MarkdownComponent({
  children,
  id,
  className,
  components = INITIAL_COMPONENTS,
}: MarkdownProps) {
  const generatedId = useId()
  const blockId = id ?? generatedId
  
  // Memoize the blocks parsing to avoid re-computation on every render
  const blocks = useMemo(() => parseMarkdownIntoBlocks(children), [children])

  // Memoize the render function with proper type checking
  const renderedBlocks = useMemo(() => {
    if (!blocks || !Array.isArray(blocks)) return null
    
    return blocks.map((block: string, index: number) => (
      <MemoizedMarkdownBlock
        key={`${blockId}-block-${index}`}
        content={block}
        components={components}
      />
    ))
  }, [blocks, blockId, components])

  return (
    <div className={className}>
      {renderedBlocks}
    </div>
  )
}

// Apply memo with custom comparison for better performance
const Markdown = memo(MarkdownComponent, (prevProps, nextProps) => {
  return (
    prevProps.children === nextProps.children &&
    prevProps.id === nextProps.id &&
    prevProps.className === nextProps.className &&
    prevProps.components === nextProps.components
  )
})

Markdown.displayName = "Markdown"

export { Markdown }
