import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import styled from 'styled-components';
import { RenderedPost } from '../../components/Blog/RenderedPost';
import { createPost, updatePost, getPost, uploadFile } from '../../lib/adminApi';
import { TEMPLATE_OPTIONS } from './options';
import type { PostStatus, PostTemplate } from '../../types';

const AdminEditor: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isCreate = !id || id === 'new';

  const [loaded, setLoaded] = useState(isCreate);
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [body, setBody] = useState('');
  const [template, setTemplate] = useState<PostTemplate>('standard');
  const [status, setStatus] = useState<PostStatus>('draft');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isCreate || !id) return;
    let active = true;
    getPost(id)
      .then((p) => {
        if (!active) return;
        setTitle(p.title);
        setSlug(p.slug);
        setBody(p.body);
        setTemplate(p.template);
        setStatus(p.status);
        setCoverImageUrl(p.coverImageUrl ?? '');
        setLoaded(true);
      })
      .catch((e: Error) => active && setError(e.message));
    return () => {
      active = false;
    };
  }, [id, isCreate]);

  const handleCover = async (file?: File) => {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      setCoverImageUrl(await uploadFile(file));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const handleInsertMedia = async (file?: File) => {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const url = await uploadFile(file);
      setBody((b) => `${b}\n\n![](${url})\n`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const input = { title, body, template, coverImageUrl: coverImageUrl || null, status };
      if (isCreate) await createPost(input);
      else if (id) await updatePost(id, input);
      navigate('/writing/admin');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (!loaded) return <Page>Loading…</Page>;

  return (
    <Page>
      <TopBar>
        <BackLink to="/writing/admin">← all posts</BackLink>
        <Actions>
          <StatusSelect
            aria-label="Status"
            value={status}
            onChange={(e) => setStatus(e.target.value as PostStatus)}
          >
            <option value="draft">Draft</option>
            <option value="published">Published</option>
          </StatusSelect>
          <Save type="button" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </Save>
        </Actions>
      </TopBar>

      {error && <ErrorBar>Error: {error}</ErrorBar>}

      <Field>
        <Lbl htmlFor="title">Title</Lbl>
        <TextInput id="title" value={title} onChange={(e) => setTitle(e.target.value)} />
        {!isCreate && <Hint>slug: /{slug}</Hint>}
      </Field>

      <Grid2>
        <Field>
          <Lbl htmlFor="template">Template</Lbl>
          <Select
            id="template"
            value={template}
            onChange={(e) => setTemplate(e.target.value as PostTemplate)}
          >
            {TEMPLATE_OPTIONS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field>
          <Lbl htmlFor="cover">Cover URL</Lbl>
          <CoverRow>
            <TextInput
              id="cover"
              value={coverImageUrl}
              onChange={(e) => setCoverImageUrl(e.target.value)}
            />
            <UploadLabel>
              {uploading ? '…' : 'Upload'}
              <input
                type="file"
                aria-label="Upload cover"
                hidden
                onChange={(e) => handleCover(e.target.files?.[0])}
              />
            </UploadLabel>
          </CoverRow>
        </Field>
      </Grid2>

      <Field>
        <Lbl htmlFor="body">Body (markdown)</Lbl>
        <UploadLabel>
          Insert media
          <input
            type="file"
            aria-label="Insert media"
            hidden
            onChange={(e) => handleInsertMedia(e.target.files?.[0])}
          />
        </UploadLabel>
      </Field>

      <Split>
        <Editor
          id="body"
          aria-label="Body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          spellCheck={false}
        />
        <Preview>
          <PreviewLabel>Preview · {template}</PreviewLabel>
          <RenderedPost
            template={template}
            title={title}
            coverImageUrl={coverImageUrl || null}
            publishedAt={Date.now()}
            body={body}
            contained
          />
        </Preview>
      </Split>
    </Page>
  );
};

export default AdminEditor;

const Page = styled.div`
  min-height: 100dvh;
  background: #12102a;
  color: rgba(255, 255, 255, 0.85);
  padding: 4rem 1.5rem;
  max-width: 1100px;
  margin: 0 auto;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
`;

const TopBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 2rem;
`;

const BackLink = styled(Link)`
  font-size: 0.62rem;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.5);
  text-decoration: none;
  &:hover {
    color: rgba(255, 255, 255, 0.85);
  }
`;

const Actions = styled.div`
  display: flex;
  gap: 0.75rem;
  align-items: center;
`;

const ErrorBar = styled.div`
  background: rgba(248, 113, 113, 0.12);
  color: #fca5a5;
  border: 1px solid rgba(248, 113, 113, 0.3);
  border-radius: 6px;
  padding: 0.6rem 0.85rem;
  font-size: 0.78rem;
  margin-bottom: 1.5rem;
`;

const Field = styled.div`
  margin-bottom: 1.4rem;
`;

const Lbl = styled.label`
  display: block;
  font-size: 0.6rem;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.5);
  margin-bottom: 0.5rem;
`;

const Hint = styled.span`
  display: block;
  margin-top: 0.4rem;
  font-size: 0.62rem;
  color: rgba(255, 255, 255, 0.35);
`;

const inputStyles = `
  width: 100%;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 6px;
  color: #fff;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 0.85rem;
  padding: 0.6rem 0.75rem;
  outline: none;

  &:focus {
    border-color: rgba(252, 211, 77, 0.5);
  }
`;

const TextInput = styled.input`
  ${inputStyles}
`;

const Select = styled.select`
  ${inputStyles}
`;

const StatusSelect = styled.select`
  ${inputStyles}
  width: auto;
  padding: 0.5rem 0.7rem;
`;

const Grid2 = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.2rem;

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

const CoverRow = styled.div`
  display: flex;
  gap: 0.6rem;
`;

const UploadLabel = styled.label`
  display: inline-flex;
  align-items: center;
  white-space: nowrap;
  font-size: 0.62rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 6px;
  padding: 0.5rem 0.75rem;
  cursor: pointer;

  &:hover {
    border-color: rgba(252, 211, 77, 0.5);
    color: #fff;
  }
`;

const Save = styled.button`
  font-family: inherit;
  font-size: 0.7rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #12102a;
  background: #fcd34d;
  border: none;
  padding: 0.55rem 1.1rem;
  border-radius: 6px;
  cursor: pointer;

  &:disabled {
    opacity: 0.6;
    cursor: default;
  }
`;

const Split = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.2rem;
  align-items: start;

  @media (max-width: 820px) {
    grid-template-columns: 1fr;
  }
`;

const Editor = styled.textarea`
  ${inputStyles}
  min-height: 60vh;
  line-height: 1.6;
  resize: vertical;
`;

const Preview = styled.div`
  min-height: 60vh;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 6px;
  padding: 1.2rem 1.4rem;
  overflow: hidden;
`;

const PreviewLabel = styled.div`
  font-size: 0.58rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.35);
  margin-bottom: 1.2rem;
`;
