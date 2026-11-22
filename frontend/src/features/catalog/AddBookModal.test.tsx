import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import type { Book } from '@shared/library';
import { AddBookModal } from './AddBookModal';
import { BookDetailFields } from './BookDetailFields';

const book: Book = {
  id: '1',
  title: 'Title',
  author: 'Author',
  genre: '__custom__',
  stock: 1,
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
};

test('editing preserves an absent language and a genre matching the custom option', () => {
  const html = renderToStaticMarkup(
    <AddBookModal
      bookToEdit={book}
      existingGenres={[]}
      isSubmitting={false}
      onClose={() => {}}
      onSubmit={async () => {}}
    />
  );
  assert.match(html, /id="book-language-input"[^>]*value=""/);
  assert.match(html, />__custom__<\/span>/);
  assert.doesNotMatch(html, /id="book-custom-genre-input"/);
});

test('publisher, shelf and language errors are associated with their fields', () => {
  const html = renderToStaticMarkup(
    <BookDetailFields
      inputBase=""
      fieldErrors={{
        publisher: 'Publisher error',
        shelfLocation: 'Shelf error',
        language: 'Language error',
      }}
      values={{
        yearInput: '',
        isbn: '',
        publisher: '',
        pagesInput: '',
        shelfLocation: '',
        language: '',
        description: '',
      }}
      onChange={() => {}}
    />
  );
  for (const [field, error, message] of [
    ['book-publisher-input', 'book-publisher-error', 'Publisher error'],
    ['book-shelf-input', 'book-shelf-error', 'Shelf error'],
    ['book-language-input', 'book-language-error', 'Language error'],
  ]) {
    assert.match(
      html,
      new RegExp(`id="${field}"[^>]*aria-invalid="true"[^>]*aria-describedby="${error}"`)
    );
    assert.match(html, new RegExp(`id="${error}"[^>]*>${message}</p>`));
  }
});
