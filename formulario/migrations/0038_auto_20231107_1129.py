# Generated by Django 3.2.15 on 2023-11-07 14:29

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('formulario', '0037_auto_20231025_1335'),
    ]

    operations = [
        migrations.AlterField(
            model_name='protocolosolicitud',
            name='direccion',
            field=models.CharField(blank=True, choices=[('', ''), ('Dirección de Medioambiente', 'Dirección de Medioambiente'), ('Dirección de Obras Municipales', 'Dirección de Obras Municipales'), ('Dirección desarrollo Económico y Cooperación Internacional', 'Dirección desarrollo Económico y Cooperación Internacional'), ('Dirección de Operaciones', 'Dirección de Operaciones'), ('Dirección de Tránsito y Transporte públicos', 'Dirección de Tránsito y Transporte públicos'), ('Dirección de Seguridad Ciudadana', 'Dirección de Seguridad Ciudadana'), ('Dirección de Desarrollo Cultural', 'Dirección de Desarrollo Cultural'), ('Dirección de Género, Mujeres y Diversidades', 'Dirección de Género, Mujeres y Diversidades'), ('Dirección de Vivienda, Barrio y Territorio', 'Dirección de Vivienda, Barrio y Territorio'), ('Dirección de Administración y Finaza', 'Dirección de Administración y Finaza'), ('SECPLA', 'SECPLA'), ('Dirección de Desarrollo Comunitario', 'Dirección de Desarrollo Comunitario')], default='', max_length=100),
        ),
        migrations.AlterField(
            model_name='protocolosolicitud',
            name='estado',
            field=models.CharField(blank=True, choices=[('EN PROCESO', 'EN PROCESO'), ('RECHAZADO', 'RECHAZADO'), ('RECIBIDO', 'RECIBIDO'), ('EJECUTADO', 'EJECUTADO')], default='RECIBIDO', max_length=100),
        ),
    ]
