import { Test, TestingModule } from '@nestjs/testing';
import { MenuImagesService } from './menu-images.service';

describe('MenuImagesService', () => {
  let service: MenuImagesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MenuImagesService],
    }).compile();

    service = module.get<MenuImagesService>(MenuImagesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
