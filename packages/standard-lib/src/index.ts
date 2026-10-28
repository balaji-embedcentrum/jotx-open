import { registry } from '@jotx-labs/registry';

// Import all blocks
import { ParagraphBlock } from './blocks/Paragraph';
import { HeadingBlock } from './blocks/Heading';
import { QuoteBlock } from './blocks/Quote';
import { ListBlock, ListItemBlock } from './blocks/List';
import { CodeBlock } from './blocks/Code';
import { ChecklistBlock, TaskItemBlock } from './blocks/Checklist';
import { MathBlock } from './blocks/Math';
import { ImageBlock } from './blocks/Image';
import { FloatImageBlock } from './blocks/FloatImage';
import { VideoBlock } from './blocks/Video';
import { CodeReferenceBlock } from './blocks/CodeReference';
import { CalloutBlock } from './blocks/Callout';
import { SectionBlock } from './blocks/Section';
import { ToggleBlock } from './blocks/Toggle';
import { TableBlock } from './blocks/Table';
import { PropertiesBlock } from './blocks/Properties';
import { PropertyBlock } from './blocks/Property';
import { DividerBlock } from './blocks/Divider';
import { LinkBlock } from './blocks/Link';
import { AttachmentBlock } from './blocks/Attachment';
import { MermaidBlock } from './blocks/Mermaid';
import { ChartBlock } from './blocks/Chart';
import { DateTimeBlock } from './blocks/DateTime';
import { LinkCardBlock } from './blocks/LinkCard';
import { JotxLinkBlock } from './blocks/JotxLink';
import { BlockRefBlock } from './blocks/BlockRef';
import { RowBlock } from './blocks/Row';
import { CellBlock } from './blocks/Cell';
import { HeaderBlock } from './blocks/Header';
import { GridCardBlock } from './blocks/GridCard';
import { CardBlock } from './blocks/Card';
import { ButtonBlock } from './blocks/Button';
import { ButtonStripBlock } from './blocks/ButtonStrip';
import { ColumnsBlock, ColumnBlock, TabBlock } from './blocks/Columns';
import { WidgetBlocks } from './blocks/Widgets';

export function registerStandardBlocks() {
    // Text blocks
    registry.register(ParagraphBlock);
    registry.register(HeadingBlock);
    registry.register(QuoteBlock);

    // List blocks
    registry.register(ListBlock);
    registry.register(ListItemBlock);
    registry.register(ChecklistBlock);
    registry.register(TaskItemBlock);

    // Code & media blocks
    registry.register(CodeBlock);
    registry.register(MathBlock);
    registry.register(ImageBlock);
    registry.register(FloatImageBlock);
    registry.register(VideoBlock);
    registry.register(CodeReferenceBlock);

    // Container blocks
    registry.register(CalloutBlock);
    registry.register(SectionBlock);
    registry.register(ToggleBlock);

    // Data blocks
    registry.register(TableBlock);
    // Rows, cells and headers are registered once, from Row/Cell/Header below
    registry.register(PropertiesBlock);
    registry.register(PropertyBlock);

    // Separator & embed blocks
    registry.register(DividerBlock);
    registry.register(LinkBlock);
    registry.register(AttachmentBlock);

    // Rich/interactive blocks
    registry.register(MermaidBlock);
    registry.register(ChartBlock);
    registry.register(DateTimeBlock);
    registry.register(LinkCardBlock);
    registry.register(JotxLinkBlock);
    registry.register(BlockRefBlock);
    registry.register(RowBlock);
    registry.register(CellBlock);
    registry.register(HeaderBlock);

    // Navigation blocks
    registry.register(GridCardBlock);
    registry.register(CardBlock);
    registry.register(ButtonBlock);
    registry.register(ButtonStripBlock);

    // Layout blocks
    registry.register(ColumnsBlock);
    registry.register(ColumnBlock);
    registry.register(TabBlock);

    // Widgets
    WidgetBlocks.forEach(def => registry.register(def));

}

// Export all blocks
export * from './blocks/Paragraph';
export * from './blocks/Heading';
export * from './blocks/Quote';
export * from './blocks/List';
export * from './blocks/Code';
export * from './blocks/Checklist';
export * from './blocks/Math';
export * from './blocks/Image';
export * from './blocks/FloatImage';
export * from './blocks/Video';
export * from './blocks/CodeReference';
export * from './blocks/Callout';
export * from './blocks/Section';
export * from './blocks/Toggle';
export * from './blocks/Table';
export * from './blocks/Properties';
export * from './blocks/Property';
export * from './blocks/Divider';
export * from './blocks/Link';
export * from './blocks/Attachment';
export * from './blocks/Mermaid';
export * from './blocks/Chart';
export * from './blocks/DateTime';
export * from './blocks/LinkCard';
export * from './blocks/JotxLink';
export * from './blocks/BlockRef';
export * from './blocks/Row';
export * from './blocks/Cell';
export * from './blocks/Header';
export * from './blocks/GridCard';
export * from './blocks/Card';
export * from './blocks/Button';
export * from './blocks/ButtonStrip';
export * from './blocks/Columns';
export * from './blocks/Widgets';
