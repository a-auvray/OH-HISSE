using System;
using System.Diagnostics;
using System.IO;

/// Petit lanceur : démarre lancer.bat (situé à côté de ce programme) dans cette fenêtre.
/// Tout le travail (interface, migrations, sauvegarde, serveur) est dans lancer.bat.
static class Lanceur
{
    static int Main()
    {
        string dossier = AppDomain.CurrentDomain.BaseDirectory;
        string script = Path.Combine(dossier, "lancer.bat");
        Console.Title = "Oh Hisse !";

        if (!File.Exists(script))
        {
            Console.Error.WriteLine("lancer.bat est introuvable à côté de ce programme :");
            Console.Error.WriteLine(dossier);
            Console.Error.WriteLine("Garde « Oh Hisse.exe » dans le dossier du projet (ou crée-en un raccourci).");
            Console.Error.WriteLine("Appuie sur une touche pour fermer.");
            Console.ReadKey(true);
            return 1;
        }

        var info = new ProcessStartInfo("cmd.exe", "/c \"\"" + script + "\"\"")
        {
            WorkingDirectory = dossier,
            UseShellExecute = false,
        };
        using (Process p = Process.Start(info))
        {
            p.WaitForExit();
            return p.ExitCode;
        }
    }
}
