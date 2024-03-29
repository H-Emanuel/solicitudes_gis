# Generated by Django 3.2.15 on 2023-10-25 16:24

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('formulario', '0035_auto_20231025_1323'),
    ]

    operations = [
        migrations.AlterField(
            model_name='protocolosolicitud',
            name='direccion',
            field=models.CharField(blank=True, choices=[('Dirección de Obras Municipales', 'Dirección de Obras Municipales'), ('Dirección de Vivienda, Barrio y Territorio', 'Dirección de Vivienda, Barrio y Territorio'), ('Dirección de Desarrollo Comunitario', 'Dirección de Desarrollo Comunitario'), ('SECPLA', 'SECPLA'), ('Dirección de Tránsito y Transporte públicos', 'Dirección de Tránsito y Transporte públicos'), ('', ''), ('Dirección desarrollo Económico y Cooperación Internacional', 'Dirección desarrollo Económico y Cooperación Internacional'), ('Dirección de Desarrollo Cultural', 'Dirección de Desarrollo Cultural'), ('Dirección de Administración y Finaza', 'Dirección de Administración y Finaza'), ('Dirección de Medioambiente', 'Dirección de Medioambiente'), ('Dirección de Seguridad Ciudadana', 'Dirección de Seguridad Ciudadana'), ('Dirección de Género, Mujeres y Diversidades', 'Dirección de Género, Mujeres y Diversidades'), ('Dirección de Operaciones', 'Dirección de Operaciones')], default='', max_length=100),
        ),
        migrations.AlterField(
            model_name='protocolosolicitud',
            name='estado',
            field=models.CharField(blank=True, choices=[('RECIBIDO', 'RECIBIDO'), ('EJECUTADO', 'EJECUTADO'), ('EN PROCESO', 'EN PROCESO'), ('RECHAZADO', 'RECHAZADO')], default='RECIBIDO', max_length=100),
        ),
    ]
