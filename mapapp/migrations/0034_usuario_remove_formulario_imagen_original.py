# Generated by Django 5.1.7 on 2025-05-29 18:48

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('mapapp', '0033_merge_20250525_0310'),
    ]

    operations = [
        migrations.CreateModel(
            name='Usuario',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('nombre', models.CharField(max_length=100, unique=True)),
                ('password', models.CharField(max_length=128)),
            ],
        ),
    ]
