import { validate } from 'class-validator';
import { MustBeTrue } from '../must-be-true.validator';

class TestDto {
  @MustBeTrue()
  acceptedTerms!: boolean;
}

describe('MustBeTrue', () => {
  it('passes validation when the field is literally true', async () => {
    const dto = new TestDto();
    dto.acceptedTerms = true;
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('fails validation when the field is false', async () => {
    const dto = new TestDto();
    dto.acceptedTerms = false;
    const errors = await validate(dto);
    expect(errors).toHaveLength(1);
    expect(errors[0].constraints).toHaveProperty('mustBeTrue');
  });

  it('fails validation when the field is omitted (undefined)', async () => {
    const dto = new TestDto();
    const errors = await validate(dto);
    expect(errors).toHaveLength(1);
  });

  it('fails validation for a truthy-but-not-boolean value (e.g. the string "true")', async () => {
    const dto = new TestDto();
    (dto as any).acceptedTerms = 'true';
    const errors = await validate(dto);
    expect(errors).toHaveLength(1);
  });

  it('produces a message naming the field', async () => {
    const dto = new TestDto();
    dto.acceptedTerms = false;
    const errors = await validate(dto);
    expect(errors[0].constraints?.mustBeTrue).toContain('acceptedTerms');
  });
});
