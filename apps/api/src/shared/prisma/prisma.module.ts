import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { TenantDirectoryService } from './tenant-directory.service';

@Global()
@Module({
  providers: [PrismaService, TenantDirectoryService],
  exports: [PrismaService, TenantDirectoryService],
})
export class PrismaModule {}
