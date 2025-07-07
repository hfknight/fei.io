import type { JsonData, JsonSection, TimeSection } from "../types";

export const parseTitle = (title: JsonSection['title']): React.ReactNode => {
  if (title.highlight) {
    const parts = title.text.split(title.highlight);
    return (
      <>
        {parts[0]}
        <span>{title.highlight}</span>
        {parts[1]}
      </>
    );
  }
  return title.text;
};

export const parseSubtitle = (subtitle: string): React.ReactNode => {
  if (subtitle.includes('<br/>')) {
    const parts = subtitle.split('<br/>');
    return (
      <>
        {parts[0]}
        <br />
        {parts[1]}
      </>
    );
  }
  return subtitle;
};

export const transformJsonToTimeSections = (jsonData: JsonData): TimeSection[] => {
  return jsonData.sections.map((section) => ({
    id: section.id,
    title: parseTitle(section.title),
    subtitle: section.subtitle ? parseSubtitle(section.subtitle) : undefined,
    gradient: section.gradient,
  }));
};