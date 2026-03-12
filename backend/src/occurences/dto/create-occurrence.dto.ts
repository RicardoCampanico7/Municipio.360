import { IsArray, IsOptional, IsString, MinLength, ArrayMaxSize } from 'class-validator';

export class CreateOccurrenceDto {
  @IsString()
  @MinLength(2)
  category: string;

  @IsString()
  @MinLength(3)
  description: string;

  @IsString()
  @MinLength(2)
  location: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  imageUrls?: string[];
}