import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

// Feature modules will be imported here as we build them, e.g.:
import { AuthModule } from './modules/auth/auth.module';
// import { WarehousesModule } from './modules/warehouses/warehouses.module';
// import { UsersModule } from './modules/users/users.module';
// import { ProductsModule } from './modules/products/products.module';
// import { CategoriesModule } from './modules/categories/categories.module';
// import { SuppliersModule } from './modules/suppliers/suppliers.module';
// import { TransactionsModule } from './modules/transactions/transactions.module';
// import { DashboardModule } from './modules/dashboard/dashboard.module';
// import { ReportsModule } from './modules/reports/reports.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('DB_HOST'),
        port: config.get<number>('DB_PORT'),
        username: config.get<string>('DB_USERNAME'),
        password: config.get<string>('DB_PASSWORD'),
        database: config.get<string>('DB_NAME'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: false, // never true beyond local experimentation — we use migrations
        migrations: [__dirname + '/database/migrations/*{.ts,.js}'],
      }),
    }),

    // Feature modules go here as they're built, sprint by sprint:
    AuthModule,
    // WarehousesModule,
    // UsersModule,
    // ProductsModule,
    // CategoriesModule,
    // SuppliersModule,
    // TransactionsModule,
    // DashboardModule,
    // ReportsModule,
  ],
})
export class AppModule {}
