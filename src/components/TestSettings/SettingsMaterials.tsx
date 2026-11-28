import IconMaterialBlank from '../../assets/icons/test-settings/blank.svg?react';
import IconMaterialExample from '../../assets/icons/test-settings/conclusion.svg?react';
import IconMaterialChevron from '../../assets/icons/test-settings/chevron-right.svg?react';

export function SettingsMaterials({ blankLabel, exampleLabel, onBlank, onExample }: {
  blankLabel: string;
  exampleLabel: string;
  onBlank?: () => void;
  onExample?: () => void;
}) {
  if (!onBlank && !onExample) return null;
  const materials = [
    { label: blankLabel, open: onBlank, Icon: IconMaterialBlank },
    { label: exampleLabel, open: onExample, Icon: IconMaterialExample },
  ];
  return (
    <ul className="ts-card ts-materials">
      {materials.map(({ label, open, Icon }) => open && (
        <li key={label}>
          <button type="button" className="ts-row ts-row--link" onClick={open}>
            <Icon className="ts-row__icon" aria-hidden="true" />
            <span className="ts-row__link">{label}</span>
            <IconMaterialChevron className="ts-row__chevron" aria-hidden="true" />
          </button>
        </li>
      ))}
    </ul>
  );
}
