from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("mapapp", "0025_formulario_texto_boton_enviar"),
    ]

    operations = [
        migrations.AddField(
            model_name="formulario",
            name="permitir_volver_a_contestar",
            field=models.BooleanField(default=False, help_text="Permitir que el usuario vuelva a contestar tras enviar."),
        ),
    ]
