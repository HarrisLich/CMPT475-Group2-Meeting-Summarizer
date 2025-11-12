/**
 * -- Output Download Service --
 * Handles exporting meeting data (summary, transcript, action items) to various formats.
 */
import jsPDF from 'jspdf';


interface TranscriptSegment {
  start: number;
  end: number;
  text: string;
}

interface ActionItem {
  id: string;
  priority: "high" | "medium" | "low";
  task: string;
  assignedTo: string;
}

export interface MeetingData {
  summary: string;
  transcript: string;
  transcriptSegments: TranscriptSegment[];
  actionItems: ActionItem[];
  meetingTitle: string;
}

export type DownloadType = 'summary' | 'transcript' | 'action-items' | 'all';
export type DownloadFormat = 'pdf' | 'txt' | 'md'; // Extensible for future formats

interface DownloadContent {
  sections: Section[];
  filename: string;
}

interface Section {
  title: string;
  content: string;
  type: 'heading' | 'text' | 'list' | 'table';
}



// Main download function - entry point for all exports
export const downloadMeetingData = (
  type: DownloadType,
  data: MeetingData,
  format: DownloadFormat = 'pdf'
): void => {
  // 1. Prepare content based on type
  const content = prepareDownloadContent(type, data);

  // 2. Generate file based on format
  switch (format) {
    case 'pdf':
      generatePDF(content);
      break;
    case 'txt':
      generateTextFile(content);
      break;
    case 'md':
      generateMarkdownFile(content);
      break;
    default:
      console.error(`Unsupported format: ${format}`);
  }
};

// Prepares content sections based on download type
const prepareDownloadContent = (type: DownloadType, data: MeetingData): DownloadContent => {
  const sections: Section[] = [];
  let filename = '';

  switch (type) {
    case 'summary':
      sections.push(...formatSummary(data));
      filename = `${sanitizeFilename(data.meetingTitle)}_summary`;
      break;

    case 'transcript':
      sections.push(...formatTranscript(data));
      filename = `${sanitizeFilename(data.meetingTitle)}_transcript`;
      break;

    case 'action-items':
      sections.push(...formatActionItems(data));
      filename = `${sanitizeFilename(data.meetingTitle)}_action-items`;
      break;

    case 'all':
      sections.push(
        ...formatSummary(data),
        { title: '', content: '', type: 'heading' }, 
        ...formatActionItems(data),
        { title: '', content: '', type: 'heading' },
        ...formatTranscript(data)
      );
      filename = `${sanitizeFilename(data.meetingTitle)}_complete`;
      break;

    default:
      throw new Error(`Unknown download type: ${type}`);
  }

  return { sections, filename };
};

const formatSummary = (data: MeetingData): Section[] => {
  return [
    {
      title: `Meeting Summary: ${data.meetingTitle}`,
      content: '',
      type: 'heading'
    },
    {
      title: '',
      content: data.summary,
      type: 'text'
    }
  ];
};


const formatTranscript = (data: MeetingData): Section[] => {
  const sections: Section[] = [
    {
      title: 'Transcript',
      content: '',
      type: 'heading'
    }
  ];

  // use segments if available (timestamped), otherwise use raw transcript
  if (data.transcriptSegments && data.transcriptSegments.length > 0) {
    const formattedSegments = data.transcriptSegments.map(segment => {
      const startTime = formatTimestamp(segment.start);
      const endTime = formatTimestamp(segment.end);
      return `[${startTime} - ${endTime}] ${segment.text}`;
    }).join('\n\n');

    sections.push({
      title: '',
      content: formattedSegments,
      type: 'text'
    });
  } else {
    sections.push({
      title: '',
      content: data.transcript || 'No transcript available.',
      type: 'text'
    });
  }

  return sections;
};


const formatActionItems = (data: MeetingData): Section[] => {
  const sections: Section[] = [
    {
      title: 'Action Items',
      content: '',
      type: 'heading'
    }
  ];

  if (!data.actionItems || data.actionItems.length === 0) {
    sections.push({
      title: '',
      content: 'No action items identified.',
      type: 'text'
    });
    return sections;
  }

  // group by priority
  const highPriority = data.actionItems.filter(item => item.priority === 'high');
  const mediumPriority = data.actionItems.filter(item => item.priority === 'medium');
  const lowPriority = data.actionItems.filter(item => item.priority === 'low');

  const formatItemList = (items: ActionItem[]) => {
    return items.map(item => `• ${item.task} (Assigned to: ${item.assignedTo})`).join('\n');
  };

  if (highPriority.length > 0) {
    sections.push({
      title: 'High Priority',
      content: formatItemList(highPriority),
      type: 'list'
    });
  }

  if (mediumPriority.length > 0) {
    sections.push({
      title: 'Medium Priority',
      content: formatItemList(mediumPriority),
      type: 'list'
    });
  }

  if (lowPriority.length > 0) {
    sections.push({
      title: 'Low Priority',
      content: formatItemList(lowPriority),
      type: 'list'
    });
  }

  return sections;
};



const generatePDF = (content: DownloadContent): void => {
  const doc = new jsPDF();
  let yPosition = 20;
  const pageHeight = 280;
  const leftMargin = 20;
  const rightMargin = 190;
  const maxWidth = rightMargin - leftMargin;
  const lineHeight = 7;

  const checkPageBreak = (additionalSpace: number = 0) => {
    if (yPosition + additionalSpace > pageHeight) {
      doc.addPage();
      yPosition = 20;
    }
  };

  const stripMarkdown = (text: string): string => {
    return text
      // Remove headers (##, ###, etc)
      .replace(/^#{1,6}\s+/gm, '')
      // Remove bold/italic (**text**, *text*, __text__, _text_)
      .replace(/(\*\*|__)(.*?)\1/g, '$2')
      .replace(/(\*|_)(.*?)\1/g, '$2')
      // Remove bullet points (-, *, +)
      .replace(/^[\s]*[-*+]\s+/gm, '• ')
      // Remove numbered lists
      .replace(/^[\s]*\d+\.\s+/gm, '• ')
      // Clean up extra whitespace
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  };

  content.sections.forEach((section, index) => {
    // Main heading (larger font)
    if (section.type === 'heading' && section.title) {
      checkPageBreak(15);

      // Use larger font for first heading, smaller for subheadings
      if (index === 0) {
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
      } else {
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
      }

      const titleLines = doc.splitTextToSize(section.title, maxWidth);
      doc.text(titleLines, leftMargin, yPosition);
      yPosition += titleLines.length * lineHeight + 5;
    }

    // Text content
    if (section.content) {
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');

      // Strip markdown formatting from content
      const cleanContent = stripMarkdown(section.content);

      if (section.type === 'list') {
        // Handle list items - already has bullet points from stripMarkdown
        const listItems = cleanContent.split('\n').filter(line => line.trim());

        listItems.forEach(item => {
          checkPageBreak(lineHeight * 3);
          const itemLines = doc.splitTextToSize(item, maxWidth - 5);
          doc.text(itemLines, leftMargin + 5, yPosition);
          yPosition += itemLines.length * lineHeight + 2;
        });

        yPosition += 5; // Extra space after list
      } else {
        // Handle regular text
        const paragraphs = cleanContent.split('\n\n');

        paragraphs.forEach(paragraph => {
          if (!paragraph.trim()) return;

          const lines = doc.splitTextToSize(paragraph, maxWidth);
          checkPageBreak(lines.length * lineHeight);
          doc.text(lines, leftMargin, yPosition);
          yPosition += lines.length * lineHeight + 3;
        });
      }

      yPosition += 5; // Extra space between sections
    }
  });

  doc.save(`${content.filename}.pdf`);
};

/**
 * Generate plain text file
 */
const generateTextFile = (content: DownloadContent): void => {
  let textContent = '';

  content.sections.forEach(section => {
    if (section.title) {
      textContent += `\n${section.title}\n${'='.repeat(section.title.length)}\n\n`;
    }
    if (section.content) {
      textContent += `${section.content}\n\n`;
    }
  });

  downloadFile(textContent, `${content.filename}.txt`, 'text/plain');
};

/**
 * Generate Markdown file
 */
const generateMarkdownFile = (content: DownloadContent): void => {
  let mdContent = '';

  content.sections.forEach(section => {
    if (section.title) {
      mdContent += `\n## ${section.title}\n\n`;
    }
    if (section.content) {
      mdContent += `${section.content}\n\n`;
    }
  });

  downloadFile(mdContent, `${content.filename}.md`, 'text/markdown');
};

// --- Utility Stuffs

// Download to browser
const downloadFile = (content: string, filename: string, mimeType: string): void => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// Timestamp formating
const formatTimestamp = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${minutes}:${String(secs).padStart(2, '0')}`;
};

// Clean up file names
const sanitizeFilename = (filename: string): string => {
  return filename
    .replace(/[^a-z0-9]/gi, '_')
    .replace(/_+/g, '_')
    .toLowerCase();
};
