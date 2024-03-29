# Generated by Django 3.2.15 on 2023-10-05 13:40

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('formulario', '0027_alter_protocolosolicitud_estado'),
    ]

    operations = [
        migrations.AlterField(
            model_name='protocolosolicitud',
            name='estado',
            field=models.CharField(blank=True, choices=[('RECHAZADO', 'RECHAZADO'), ('EJECUTADO', 'EJECUTADO'), ('RECIBIDO', 'RECIBIDO'), ('EN PROCESO', 'EN PROCESO')], default='RECIBIDO', max_length=100),
        ),
    ]
