import { transformJsonToTimeSections } from './index';
import type { JsonData } from '../types';

describe('transformJsonToTimeSections', () => {
  it('maps json sections to time sections', () => {
    const json: JsonData = {
      sections: [
        { id: 'dawn', title: { text: 'Dawn' }, gradient: 'linear-gradient(#000,#111)' },
      ],
    };

    const result = transformJsonToTimeSections(json);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('dawn');
    expect(result[0].title).toBe('Dawn');
    expect(result[0].gradient).toBe('linear-gradient(#000,#111)');
    expect(result[0].subtitle).toBeUndefined();
  });
});
