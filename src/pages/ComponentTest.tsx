import { TagPill } from '../components/TagPill';
import { RewardChip } from '../components/RewardChip';
import { CharacterAvatar } from '../components/CharacterAvatar';
import { useLanguageStore } from '../store/useLanguageStore';
import { getCharacters } from '../lib/data';

export function ComponentTest() {
  const { lang, setLanguage } = useLanguageStore();
  const characters = getCharacters();

  return (
    <div className="container mx-auto p-8 space-y-8">
      <h1 className="text-3xl font-bold">Component Test Page</h1>

      {/* Language Switcher */}
      <div className="flex gap-2">
        <button
          onClick={() => setLanguage('ja')}
          className={`px-4 py-2 rounded ${lang === 'ja' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
        >
          日本語
        </button>
        <button
          onClick={() => setLanguage('zh-Hans')}
          className={`px-4 py-2 rounded ${lang === 'zh-Hans' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
        >
          简体中文
        </button>
        <button
          onClick={() => setLanguage('zh-Hant')}
          className={`px-4 py-2 rounded ${lang === 'zh-Hant' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
        >
          繁體中文
        </button>
      </div>

      {/* TagPill Examples */}
      <section>
        <h2 className="text-2xl font-semibold mb-4">TagPill</h2>
        <div className="flex flex-wrap gap-2">
          <TagPill tagId="role-001" category="role" />
          <TagPill tagId="role-002" category="role" highlight />
          <TagPill tagId="style-001" category="style" />
          <TagPill tagId="style-004" category="style" highlight />
          <TagPill tagId="faction-001" category="faction" />
          <TagPill tagId="rarity-005" category="rarity" />
          <TagPill tagId="rarity-004" category="rarity" />
        </div>
      </section>

      {/* RewardChip Examples */}
      <section>
        <h2 className="text-2xl font-semibold mb-4">RewardChip</h2>
        <div className="flex flex-wrap gap-2">
          <RewardChip reward={{ itemId: 'gold', amount: { min: 12000, max: 12000 }, category: 'currency' }} />
          <RewardChip reward={{ itemId: 'exp_item', amount: { min: 5, max: 10 }, category: 'exp_character' }} />
          <RewardChip reward={{ itemId: 'rare_mat', amount: { min: 1, max: 3 }, category: 'tier_disc' }} />
        </div>
      </section>

      {/* CharacterAvatar Examples */}
      <section>
        <h2 className="text-2xl font-semibold mb-4">CharacterAvatar</h2>
        <div className="flex flex-wrap gap-4">
          {characters.slice(0, 3).map((char) => (
            <CharacterAvatar key={char.id} character={char} />
          ))}
          {characters.slice(0, 2).map((char) => (
            <CharacterAvatar key={`dimmed-${char.id}`} character={char} dimmed />
          ))}
          {characters.slice(0, 1).map((char) => (
            <CharacterAvatar key={`deficit-${char.id}`} character={char} levelDeficit={15} />
          ))}
        </div>
      </section>
    </div>
  );
}
